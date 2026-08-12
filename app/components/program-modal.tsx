"use client";

import React, { useEffect, useState } from "react";
import {
  UserOption,
  TrainingProgramFormData,
  TrainingProgramStatus,
  TRAINING_PROGRAM_STATUS_OPTIONS,
  TrainingType,
} from "@/types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { BookOpen, Calendar, FlaskConical } from "lucide-react";
import { normalizeDueDate } from "@/lib/calendar-tasks";

function toDateInputValue(value: string | null | undefined): string {
  return normalizeDueDate(value) ?? "";
}

const EMPTY_FORM: TrainingProgramFormData = {
  title: "",
  description: "",
  requesting_institution: "",
  training_code: "",
  instructor_id: "",
  start_date: "",
  end_date: "",
  status: "ongoing",
};

interface ProgramModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  programType: TrainingType;
  initialData: TrainingProgramFormData | null;
  availableInstructors: UserOption[];
  onClose: () => void;
  onSubmit: (data: TrainingProgramFormData) => void;
}

export default function ProgramModal({
  isOpen,
  isAdding,
  isSaving,
  programType,
  initialData,
  availableInstructors,
  onClose,
  onSubmit,
}: ProgramModalProps) {
  const [formState, setFormState] = useState<TrainingProgramFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isTraining = programType === "training";
  const typeLabel = isTraining ? "Training" : "Internship";
  const leaderLabel = isTraining ? "Instructor" : "Mentor";

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) errs.title = "Title is required";
    if (!formState.instructor_id) {
      errs.instructor_id = `Please select a ${leaderLabel.toLowerCase()}`;
    }
    if (!formState.start_date) errs.start_date = "Start date is required";
    const startDate = toDateInputValue(formState.start_date);
    const endDate = toDateInputValue(formState.end_date);
    if (startDate && endDate && endDate < startDate) {
      errs.end_date = "End date cannot be before start date";
    }
    return errs;
  };

  useEffect(() => {
    if (isOpen) {
      setFormState(
        initialData
          ? {
              ...initialData,
              start_date: toDateInputValue(initialData.start_date),
              end_date: toDateInputValue(initialData.end_date),
            }
          : {
              ...EMPTY_FORM,
              instructor_id: availableInstructors[0]?.id || "",
            },
      );
      setErrors({});
    }
  }, [isOpen, initialData, availableInstructors]);

  const handleInputChange = (
    key: keyof TrainingProgramFormData,
    value: string,
  ) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value as TrainingProgramFormData[typeof key],
    }));
    setErrors((prev) => {
      const next = { ...prev, [key]: "" };
      if (key === "start_date" || key === "end_date") {
        next.end_date = "";
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit({
      ...formState,
      start_date: toDateInputValue(formState.start_date),
      end_date: toDateInputValue(formState.end_date),
    });
  };

  const statusChoices = TRAINING_PROGRAM_STATUS_OPTIONS.filter(
    (opt) => opt.value !== "archived" || !isAdding,
  );

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? `Add ${typeLabel} Program` : `Edit ${typeLabel} Program`}
      subtitle={
        isTraining
          ? "Set cohort details, instructor, schedule, and lifecycle status."
          : "Set cohort details, mentor, schedule, and lifecycle status."
      }
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
      submitDisabled={isSaving}
    >
      <div className="space-y-2.5">
        {renderSectionLabel(
          <BookOpen className="w-3.5 h-3.5" />,
          "Program Details",
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="program-title"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Title
          </label>
          <input
            id="program-title"
            type="text"
            required
            aria-invalid={!!errors.title}
            value={formState.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder={
              isTraining
                ? "e.g., DNA Barcoding Short Course"
                : "e.g., Summer Bioinformatics Internship"
            }
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
            htmlFor="program-description"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Description
          </label>
          <textarea
            id="program-description"
            rows={4}
            value={formState.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Brief overview of the cohort syllabus and goals."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-y min-h-[96px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="program-requesting-institution"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Requesting Institution
          </label>
          <input
            id="program-requesting-institution"
            type="text"
            value={formState.requesting_institution}
            onChange={(e) =>
              handleInputChange("requesting_institution", e.target.value)
            }
            placeholder="e.g., University of the Philippines Diliman"
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
        </div>

        {isTraining && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="program-training-code"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Training Code
            </label>
            <input
              id="program-training-code"
              type="text"
              value={formState.training_code}
              onChange={(e) =>
                handleInputChange("training_code", e.target.value)
              }
              placeholder="e.g., DNA-BAR-2026"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
            />
          </div>
        )}
      </div>

      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <FlaskConical className="w-3.5 h-3.5" />,
          "Leadership & Status",
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="program-instructor"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            {leaderLabel}
          </label>
          <select
            id="program-instructor"
            required
            aria-invalid={!!errors.instructor_id}
            value={formState.instructor_id}
            onChange={(e) => handleInputChange("instructor_id", e.target.value)}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          >
            {availableInstructors.length === 0 && (
              <option value="">No staff available</option>
            )}
            {availableInstructors.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          {errors.instructor_id && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
              {errors.instructor_id}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="program-status"
            className="text-xs font-bold text-slate-800 ml-1 font-aileron"
          >
            Status
          </label>
          <select
            id="program-status"
            value={formState.status}
            onChange={(e) =>
              handleInputChange(
                "status",
                e.target.value as TrainingProgramStatus,
              )
            }
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          >
            {statusChoices.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Calendar className="w-3.5 h-3.5" />,
          "Schedule",
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="program-start-date"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Start Date
            </label>
            <input
              id="program-start-date"
              type="date"
              required
              aria-invalid={!!errors.start_date}
              value={formState.start_date}
              onChange={(e) => handleInputChange("start_date", e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            />
            {errors.start_date && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                {errors.start_date}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="program-end-date"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              End Date
            </label>
            <input
              id="program-end-date"
              type="date"
              aria-invalid={!!errors.end_date}
              value={formState.end_date}
              onChange={(e) => handleInputChange("end_date", e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            />
            {errors.end_date && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                {errors.end_date}
              </p>
            )}
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
