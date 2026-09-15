"use client";

import React, { useEffect, useState } from "react";
import {
  WISHLIST_CATEGORY_OPTIONS,
  WISHLIST_STATUS_OPTIONS,
  type WishlistCategory,
  type WishlistItemFormData,
  type WishlistStatus,
} from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { FileText, Gift, StickyNote } from "lucide-react";
import { parseWishlistCost } from "@/lib/wishlist";

const inputClass =
  "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed disabled:focus:ring-0 disabled:focus:border-slate-300/80";

const textareaClass =
  "w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-none disabled:opacity-70 disabled:cursor-not-allowed disabled:focus:ring-0 disabled:focus:border-slate-300/80";

interface WishlistModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: WishlistItemFormData;
  canEditDetails: boolean;
  canChangeStatus: boolean;
  canEditNotes: boolean;
  onClose: () => void;
  onSubmit: (data: WishlistItemFormData) => void;
}

export default function WishlistModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  canEditDetails,
  canChangeStatus,
  canEditNotes,
  onClose,
  onSubmit,
}: WishlistModalProps) {
  const [formState, setFormState] = useState<WishlistItemFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleInputChange = <K extends keyof WishlistItemFormData>(
    key: K,
    value: WishlistItemFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (canEditDetails && !formState.title.trim()) {
      errs.title = "Item name is required";
    }
    if (canEditDetails && (!Number.isFinite(formState.quantity) || formState.quantity < 1)) {
      errs.quantity = "Quantity must be at least 1";
    }
    if (canEditDetails && formState.estimated_cost.trim()) {
      const cost = parseWishlistCost(formState.estimated_cost);
      if (cost == null) {
        errs.estimated_cost = "Enter a valid amount, or leave this blank";
      }
    }
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formState);
  };

  const title = isAdding
    ? "Add wish list item"
    : canEditDetails
      ? "Edit wish list item"
      : "Wish list item";
  const subtitle = isAdding
    ? "Request something the bioinfo lab needs."
    : canEditDetails
      ? "Update this request."
      : canChangeStatus
        ? "Update status or notes."
        : "Add a note on this request.";

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
      submitDisabled={!canEditDetails && !canChangeStatus && !canEditNotes}
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(<Gift className="w-3.5 h-3.5" />, "Item")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wishlist-title"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Item name
            </label>
            <input
              id="wishlist-title"
              type="text"
              value={formState.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="HDMI cable"
              disabled={!canEditDetails}
              className={inputClass}
            />
            {errors.title ? (
              <p className="text-[11px] text-red-600 ml-1">{errors.title}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="wishlist-category"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Category
              </label>
              <select
                id="wishlist-category"
                value={formState.category}
                onChange={(e) =>
                  handleInputChange(
                    "category",
                    e.target.value as WishlistCategory,
                  )
                }
                disabled={!canEditDetails}
                className={inputClass}
              >
                {WISHLIST_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="wishlist-quantity"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Quantity
              </label>
              <input
                id="wishlist-quantity"
                type="number"
                min={1}
                step={1}
                value={formState.quantity}
                onChange={(e) =>
                  handleInputChange("quantity", Number(e.target.value))
                }
                disabled={!canEditDetails}
                className={inputClass}
              />
              {errors.quantity ? (
                <p className="text-[11px] text-red-600 ml-1">{errors.quantity}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wishlist-status"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Status
            </label>
            <select
              id="wishlist-status"
              value={formState.status}
              onChange={(e) =>
                handleInputChange("status", e.target.value as WishlistStatus)
              }
              disabled={!canChangeStatus}
              className={inputClass}
            >
              {WISHLIST_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wishlist-description"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Description
            </label>
            <textarea
              id="wishlist-description"
              rows={3}
              value={formState.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Specs, size, or why the lab needs it"
              disabled={!canEditDetails}
              className={textareaClass}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Optional")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wishlist-cost"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Estimated cost (PHP)
            </label>
            <input
              id="wishlist-cost"
              type="number"
              min={0}
              step="0.01"
              value={formState.estimated_cost}
              onChange={(e) =>
                handleInputChange("estimated_cost", e.target.value)
              }
              placeholder="1500"
              disabled={!canEditDetails}
              className={inputClass}
            />
            {errors.estimated_cost ? (
              <p className="text-[11px] text-red-600 ml-1">
                {errors.estimated_cost}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wishlist-vendor"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Vendor or link
            </label>
            <input
              id="wishlist-vendor"
              type="text"
              value={formState.vendor_or_link}
              onChange={(e) =>
                handleInputChange("vendor_or_link", e.target.value)
              }
              placeholder="Supplier name or https://"
              disabled={!canEditDetails}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<StickyNote className="w-3.5 h-3.5" />, "Notes")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="wishlist-notes"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Notes
            </label>
            <textarea
              id="wishlist-notes"
              rows={4}
              value={formState.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Shared notes for the team"
              disabled={!canEditNotes}
              className={textareaClass}
            />
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
