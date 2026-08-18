"use client";

import React, { useEffect, useState } from "react";
import {
  RepositoryFormData,
  RepositoryKind,
  RepositoryCategory,
  REPOSITORY_KIND_OPTIONS,
} from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { CategoryMultiSelect } from "./category-chips";
import {
  REPOSITORY_CATEGORY_OPTIONS,
  REPOSITORY_CATEGORY_STYLES,
} from "@/lib/repository-categories";
import { Link2, Tag, FileText, Dna } from "lucide-react";

export const EMPTY_REPOSITORY_FORM: RepositoryFormData = {
  kind: "github",
  title: "",
  url: "",
  description: "",
  categories: [],
  run_id: "",
};

interface RepositoryModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: RepositoryFormData | null;
  onClose: () => void;
  onSubmit: (data: RepositoryFormData) => void;
}

export default function RepositoryModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  onClose,
  onSubmit,
}: RepositoryModalProps) {
  const [formState, setFormState] =
    useState<RepositoryFormData>(EMPTY_REPOSITORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) errs.title = "Title is required";
    if (!formState.url.trim()) {
      errs.url = "Link is required";
    } else if (!/^https?:\/\//.test(formState.url.trim())) {
      errs.url = "Must be a valid URL starting with http:// or https://";
    }
    if (!formState.categories.length) {
      errs.categories = "Select at least one category";
    }
    return errs;
  };

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_REPOSITORY_FORM);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleInputChange = <K extends keyof RepositoryFormData>(
    key: K,
    value: RepositoryFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCategoriesChange = (categories: RepositoryCategory[]) => {
    handleInputChange("categories", categories);
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

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add Repository Link" : "Edit Repository Link"}
      subtitle="Store a source link and optionally tie it to a sequencer run ID."
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Details")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="repo-title"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Title
            </label>
            <input
              id="repo-title"
              type="text"
              aria-invalid={!!errors.title}
              value={formState.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g. WGS pipeline / Client sequences folder"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
            />
            {errors.title && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="repo-url"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Link
            </label>
            <input
              id="repo-url"
              type="url"
              aria-invalid={!!errors.url}
              value={formState.url}
              onChange={(e) => handleInputChange("url", e.target.value)}
              placeholder="https://github.com/... or https://drive.google.com/..."
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
            />
            {errors.url && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                {errors.url}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="repo-description"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Description
            </label>
            <textarea
              id="repo-description"
              rows={3}
              value={formState.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Optional notes about this link"
              className="w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-none"
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          {renderSectionLabel(<Tag className="w-3.5 h-3.5" />, "Classification")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="repo-kind"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Kind
            </label>
            <select
              id="repo-kind"
              value={formState.kind}
              onChange={(e) =>
                handleInputChange("kind", e.target.value as RepositoryKind)
              }
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              {REPOSITORY_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <CategoryMultiSelect
            selected={formState.categories}
            options={REPOSITORY_CATEGORY_OPTIONS}
            styles={REPOSITORY_CATEGORY_STYLES}
            onChange={handleCategoriesChange}
            error={errors.categories}
            hint="Select one or more tags for this link."
            groupLabel="Repository categories"
          />
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          {renderSectionLabel(
            <Dna className="w-3.5 h-3.5" />,
            "Service Report Tracker",
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="repo-run-id"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Run ID
            </label>
            <input
              id="repo-run-id"
              type="text"
              value={formState.run_id}
              onChange={(e) => handleInputChange("run_id", e.target.value)}
              placeholder="e.g. PGCV_NS_0059"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm font-mono"
            />
            <p className="text-[10px] text-slate-400 ml-1 font-aileron flex items-start gap-1">
              <Link2 className="w-3 h-3 mt-0.5 shrink-0" />
              Optional. Must match a Service Report Tracker RUN ID — clicking
              that RUN ID opens this link.
            </p>
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
