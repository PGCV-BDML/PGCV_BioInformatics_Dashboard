"use client";

import React, { useEffect, useState } from "react";
import {
  PresenceStatus,
  UserPresenceFormData,
  PRESENCE_STATUS_OPTIONS,
} from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { MapPin, StickyNote, CalendarDays } from "lucide-react";

export const EMPTY_PRESENCE_FORM: UserPresenceFormData = {
  status: "in_office",
  note: "",
  until_date: "",
};

interface TeamPresenceModalProps {
  isOpen: boolean;
  isSaving: boolean;
  memberName: string;
  initialData: UserPresenceFormData | null;
  onClose: () => void;
  onSubmit: (data: UserPresenceFormData) => void;
}

export default function TeamPresenceModal({
  isOpen,
  isSaving,
  memberName,
  initialData,
  onClose,
  onSubmit,
}: TeamPresenceModalProps) {
  const [formState, setFormState] =
    useState<UserPresenceFormData>(EMPTY_PRESENCE_FORM);

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_PRESENCE_FORM);
    }
  }, [isOpen, initialData]);

  const handleInputChange = <K extends keyof UserPresenceFormData>(
    key: K,
    value: UserPresenceFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Status"
      subtitle={memberName}
      onSubmit={handleSubmit}
      submitLabel="Save status"
      isSaving={isSaving}
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(<MapPin className="w-3.5 h-3.5" />, "Presence")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-status"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Status
            </label>
            <select
              id="presence-status"
              value={formState.status}
              onChange={(e) =>
                handleInputChange("status", e.target.value as PresenceStatus)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
            >
              {PRESENCE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-until"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Until (optional)
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="presence-until"
                type="date"
                value={formState.until_date}
                onChange={(e) =>
                  handleInputChange("until_date", e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-quicksand">
              Useful for leave or travel end dates.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<StickyNote className="w-3.5 h-3.5" />, "Note")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-note"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Details (optional)
            </label>
            <textarea
              id="presence-note"
              rows={3}
              value={formState.note}
              onChange={(e) => handleInputChange("note", e.target.value)}
              placeholder="e.g. Conference in Manila, Wet lab bay 2…"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
            />
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
