"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList, Hash, Users2 } from "lucide-react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { AssigneeMultiSelect } from "./assignee-select";
import type {
  SequencingRunChecklistItemFormData,
  UserOption,
} from "@/types/database";
import { ANALYSIS_OPTIONS } from "@/lib/analysis-tracker";
import {
  EMPTY_CHECKLIST_ITEM_FORM,
  validateChecklistItemForm,
} from "@/lib/sequencing-run-checklist";

interface SequencingRunItemModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: SequencingRunChecklistItemFormData | null;
  staffUsers: UserOption[];
  onClose: () => void;
  onSubmit: (data: SequencingRunChecklistItemFormData) => void;
}

export default function SequencingRunItemModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  staffUsers,
  onClose,
  onSubmit,
}: SequencingRunItemModalProps) {
  const [formState, setFormState] =
    useState<SequencingRunChecklistItemFormData>(EMPTY_CHECKLIST_ITEM_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_CHECKLIST_ITEM_FORM);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleInputChange = <
    K extends keyof SequencingRunChecklistItemFormData,
  >(
    key: K,
    value: SequencingRunChecklistItemFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateChecklistItemForm(formState);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formState);
  };

  const fieldClass =
    "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add Checklist Row" : "Edit Checklist Row"}
      subtitle="One client job on this sequencing run."
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(
            <ClipboardList className="w-3.5 h-3.5" />,
            "Client job",
          )}
          <label
            htmlFor="checklist-client-name"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Client name
          </label>
          <input
            id="checklist-client-name"
            type="text"
            value={formState.client_name}
            onChange={(e) => handleInputChange("client_name", e.target.value)}
            placeholder="e.g. UPV, Private client"
            className={fieldClass}
          />
          {errors.client_name && (
            <p className="text-red-500 text-xs ml-1" role="alert">
              {errors.client_name}
            </p>
          )}

          <label
            htmlFor="checklist-analysis-type"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Type of analysis
          </label>
          <select
            id="checklist-analysis-type"
            value={formState.analysis_type}
            onChange={(e) => handleInputChange("analysis_type", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select analysis type…</option>
            {ANALYSIS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.analysis_type && (
            <p className="text-red-500 text-xs ml-1" role="alert">
              {errors.analysis_type}
            </p>
          )}

          <label
            htmlFor="checklist-sample-count"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            # of samples
          </label>
          <input
            id="checklist-sample-count"
            type="number"
            min={0}
            step={1}
            value={formState.sample_count}
            onChange={(e) => handleInputChange("sample_count", e.target.value)}
            className={fieldClass}
          />
          {errors.sample_count && (
            <p className="text-red-500 text-xs ml-1" role="alert">
              {errors.sample_count}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<Users2 className="w-3.5 h-3.5" />, "Analysts")}
          <AssigneeMultiSelect
            selected={formState.analyst_ids}
            users={staffUsers}
            onChange={(ids) => handleInputChange("analyst_ids", ids)}
            label="Analysts"
            hint="Select one or more analysts, or leave unassigned."
          />
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<Hash className="w-3.5 h-3.5" />, "Status")}
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formState.is_complete}
              onChange={(e) =>
                handleInputChange("is_complete", e.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-[#2a7797] focus:ring-[#4ec2bb]/30"
            />
            Mark row complete
          </label>
        </div>
      </div>
    </SlideOverModal>
  );
}
