"use client";

import React, { useEffect, useState } from "react";
import {
  COVID_SEQUENCER_OPTIONS,
  type CovidSequencingRunFormData,
} from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { Calendar, Dna, FileText, Flag, Upload } from "lucide-react";

export const EMPTY_COVID_RUN_FORM: CovidSequencingRunFormData = {
  run_number: "",
  run_id: "",
  sequencer: "",
  extraction_number: "",
  date_received: "",
  date_loaded: "",
  samples_sequenced: "0",
  lineage_assigned: "",
  uploaded_gisaid: false,
  uploaded_islap: false,
  comments: "",
  review_flag: "",
};

interface CovidRunModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: CovidSequencingRunFormData | null;
  onClose: () => void;
  onSubmit: (data: CovidSequencingRunFormData) => void;
}

export default function CovidRunModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  onClose,
  onSubmit,
}: CovidRunModalProps) {
  const [formState, setFormState] =
    useState<CovidSequencingRunFormData>(EMPTY_COVID_RUN_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_COVID_RUN_FORM);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleInputChange = <K extends keyof CovidSequencingRunFormData>(
    key: K,
    value: CovidSequencingRunFormData[K],
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
    const runNumber = Number(formState.run_number);
    if (!formState.run_number.trim() || !Number.isInteger(runNumber) || runNumber < 1) {
      errs.run_number = "Enter a positive whole-number run number";
    }

    const samples = Number(formState.samples_sequenced);
    if (
      formState.samples_sequenced.trim() === "" ||
      !Number.isInteger(samples) ||
      samples < 0
    ) {
      errs.samples_sequenced = "Enter a non-negative whole number";
    }

    if (formState.lineage_assigned.trim() !== "") {
      const assigned = Number(formState.lineage_assigned);
      if (!Number.isInteger(assigned) || assigned < 0) {
        errs.lineage_assigned = "Enter a non-negative whole number, or leave blank";
      } else if (Number.isInteger(samples) && assigned > samples) {
        errs.lineage_assigned = "Cannot exceed samples sequenced";
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

  const fieldClass =
    "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add Sequencing Run" : "Edit Sequencing Run"}
      subtitle="COVID genomic surveillance Run Summary — not a client service report."
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(<Dna className="w-3.5 h-3.5" />, "Run identity")}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-run-number"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Run number
              </label>
              <input
                id="covid-run-number"
                type="number"
                min={1}
                step={1}
                aria-invalid={!!errors.run_number}
                value={formState.run_number}
                onChange={(e) => handleInputChange("run_number", e.target.value)}
                className={fieldClass}
              />
              {errors.run_number && (
                <p className="text-red-500 text-xs ml-1 font-aileron" role="alert">
                  {errors.run_number}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-run-id"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Run ID
              </label>
              <input
                id="covid-run-id"
                type="text"
                value={formState.run_id}
                onChange={(e) => handleInputChange("run_id", e.target.value)}
                placeholder="e.g. NS_0061"
                className={`${fieldClass} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-sequencer"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Sequencer
              </label>
              <select
                id="covid-sequencer"
                value={formState.sequencer}
                onChange={(e) => handleInputChange("sequencer", e.target.value)}
                className={fieldClass}
              >
                <option value="">Not recorded</option>
                {COVID_SEQUENCER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-extraction"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Extraction #
              </label>
              <input
                id="covid-extraction"
                type="text"
                value={formState.extraction_number}
                onChange={(e) =>
                  handleInputChange("extraction_number", e.target.value)
                }
                placeholder="e.g. 56, 57"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<Calendar className="w-3.5 h-3.5" />, "Dates")}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-date-received"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Date received
              </label>
              <input
                id="covid-date-received"
                type="date"
                value={formState.date_received}
                onChange={(e) =>
                  handleInputChange("date_received", e.target.value)
                }
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-date-loaded"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Date loaded
              </label>
              <input
                id="covid-date-loaded"
                type="date"
                value={formState.date_loaded}
                onChange={(e) =>
                  handleInputChange("date_loaded", e.target.value)
                }
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Counts")}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-samples"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Samples sequenced
              </label>
              <input
                id="covid-samples"
                type="number"
                min={0}
                step={1}
                aria-invalid={!!errors.samples_sequenced}
                value={formState.samples_sequenced}
                onChange={(e) =>
                  handleInputChange("samples_sequenced", e.target.value)
                }
                className={fieldClass}
              />
              {errors.samples_sequenced && (
                <p className="text-red-500 text-xs ml-1 font-aileron" role="alert">
                  {errors.samples_sequenced}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="covid-lineage"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Lineage assigned
              </label>
              <input
                id="covid-lineage"
                type="number"
                min={0}
                step={1}
                aria-invalid={!!errors.lineage_assigned}
                value={formState.lineage_assigned}
                onChange={(e) =>
                  handleInputChange("lineage_assigned", e.target.value)
                }
                className={fieldClass}
              />
              {errors.lineage_assigned && (
                <p className="text-red-500 text-xs ml-1 font-aileron" role="alert">
                  {errors.lineage_assigned}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<Upload className="w-3.5 h-3.5" />, "Uploads")}

          <div className="flex flex-wrap gap-4 ml-1">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.uploaded_gisaid}
                onChange={(e) =>
                  handleInputChange("uploaded_gisaid", e.target.checked)
                }
                className="rounded border-slate-300 text-[#2a7797] focus:ring-[#4ec2bb]"
              />
              Uploaded GISAID
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.uploaded_islap}
                onChange={(e) =>
                  handleInputChange("uploaded_islap", e.target.checked)
                }
                className="rounded border-slate-300 text-[#2a7797] focus:ring-[#4ec2bb]"
              />
              Uploaded ISLAP
            </label>
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<Flag className="w-3.5 h-3.5" />, "Notes")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="covid-review-flag"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Review flag
            </label>
            <input
              id="covid-review-flag"
              type="text"
              value={formState.review_flag}
              onChange={(e) => handleInputChange("review_flag", e.target.value)}
              placeholder="e.g. loaded before received"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="covid-comments"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Comments
            </label>
            <textarea
              id="covid-comments"
              rows={3}
              value={formState.comments}
              onChange={(e) => handleInputChange("comments", e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-y min-h-[72px]"
            />
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
