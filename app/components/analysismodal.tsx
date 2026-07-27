"use client";

import React, { useEffect, useState } from "react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { User, Activity, Layers, Dna, FileText } from "lucide-react";
import {
  ANALYSIS_OPTIONS,
  ANALYSIS_OTHER,
  CLIENT_TYPE_OPTIONS,
  STATUS_OF_ANALYSIS_OPTIONS,
  STATUS_OF_COMPLETION_OPTIONS,
  STATUS_OF_SUBMISSION_OPTIONS,
} from "@/lib/analysis-tracker";

export { ANALYSIS_OPTIONS, ANALYSIS_OTHER };

export type AnalysisFormState = {
  service_report_number: string;
  service_report_date: string;
  pipeline: string;
  application: string;
  client_name: string;
  client_type: string;
  external_client_id: string;
  external_project_id: string;
  sample_type: string;
  run_id: string;
  status_of_analysis: string;
  status_of_completion: string;
  status_of_submission: string;
  service_report_link: string;
  client_sequences_link: string;
  notes: string;
  project_id: string;
  assignee: string;
};

export const EMPTY_ANALYSIS_FORM: AnalysisFormState = {
  service_report_number: "",
  service_report_date: "",
  pipeline: "",
  application: "",
  client_name: "",
  client_type: "",
  external_client_id: "",
  external_project_id: "",
  sample_type: "",
  run_id: "",
  status_of_analysis: "",
  status_of_completion: "",
  status_of_submission: "",
  service_report_link: "",
  client_sequences_link: "",
  notes: "",
  project_id: "",
  assignee: "",
};

interface ProjectOption {
  id: string;
  name: string;
  client: string;
}

interface AnalysisSidebarProps {
  isOpen: boolean;
  isSaving?: boolean;
  isEditing?: boolean;
  formState: AnalysisFormState;
  availableProjects: ProjectOption[];
  availableAssignees: string[];
  onClose: () => void;
  onChange: (key: keyof AnalysisFormState, value: string | number | string[] | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const inputClass =
  "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm";

export default function AnalysisSidebar({
  isOpen,
  isSaving = false,
  isEditing = false,
  formState,
  availableProjects,
  availableAssignees,
  onClose,
  onChange,
  onSubmit,
}: AnalysisSidebarProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analysisSelection, setAnalysisSelection] = useState("");
  const [otherSpecify, setOtherSpecify] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setAnalysisSelection("");
      setOtherSpecify("");
      setErrors({});
      return;
    }
    const pipe = formState.pipeline;
    if (pipe === ANALYSIS_OTHER || formState.application) {
      setAnalysisSelection(ANALYSIS_OTHER);
      setOtherSpecify(formState.application || (pipe !== ANALYSIS_OTHER ? pipe : ""));
    } else if (pipe && (ANALYSIS_OPTIONS as readonly string[]).includes(pipe)) {
      setAnalysisSelection(pipe);
      setOtherSpecify("");
    } else if (pipe) {
      setAnalysisSelection(ANALYSIS_OTHER);
      setOtherSpecify(pipe);
    } else {
      setAnalysisSelection("");
      setOtherSpecify("");
    }
  }, [isOpen, formState.pipeline, formState.application]);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (analysisSelection === ANALYSIS_OTHER && !otherSpecify.trim()) {
      errs.pipeline = "Please specify the analysis type";
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
    setErrors({});
    onSubmit(e);
  };

  const handleChange = (key: keyof AnalysisFormState, value: string | number | string[] | boolean) => {
    setErrors((prev) => ({ ...prev, [key]: "" }));
    onChange(key, value);
  };

  const handleAnalysisSelect = (value: string) => {
    setErrors((prev) => ({ ...prev, pipeline: "" }));
    setAnalysisSelection(value);
    if (value === ANALYSIS_OTHER) {
      setOtherSpecify("");
      onChange("pipeline", ANALYSIS_OTHER);
      onChange("application", "");
    } else {
      setOtherSpecify("");
      onChange("pipeline", value);
      onChange("application", "");
    }
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Service Report" : "Service Report Tracker"}
      subtitle={
        isEditing
          ? "Update this service report tracker record."
          : "Record a client sequence analysis. Empty fields are allowed."
      }
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save Changes" : "Save Record"}
      isSaving={isSaving}
      submitDisabled={isSaving}
    >
      {/* Service report identity */}
      <div className="space-y-2.5">
        {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Service Report")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-sr-number" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Service Report Number
            </label>
            <input
              id="analysis-sr-number"
              type="text"
              value={formState.service_report_number}
              onChange={(e) => handleChange("service_report_number", e.target.value)}
              placeholder="Auto: PGCV-BIOINFO-SR-YYYY-NNN"
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400 ml-1 font-aileron">
              Prefills with the next number after the latest SR# (editable).
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-sr-date" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Date (Service Report)
            </label>
            <input
              id="analysis-sr-date"
              type="date"
              value={formState.service_report_date}
              onChange={(e) => handleChange("service_report_date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Analysis classification */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(<Dna className="w-3.5 h-3.5" />, "Analysis")}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-pipeline" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Analysis Classification
          </label>
          <select
            id="analysis-pipeline"
            aria-invalid={!!errors.pipeline}
            value={analysisSelection}
            onChange={(e) => handleAnalysisSelect(e.target.value)}
            className={inputClass}
          >
            <option value="" className="text-slate-400 font-bold">
              Select analysis (optional)...
            </option>
            {ANALYSIS_OPTIONS.map((analysis) => (
              <option key={analysis} value={analysis} className="text-slate-800 font-bold">
                {analysis === ANALYSIS_OTHER ? "Others: specify" : analysis}
              </option>
            ))}
          </select>
          {analysisSelection === ANALYSIS_OTHER && (
            <input
              id="analysis-other-specify"
              type="text"
              aria-invalid={!!errors.pipeline}
              value={otherSpecify}
              onChange={(e) => {
                setErrors((prev) => ({ ...prev, pipeline: "" }));
                setOtherSpecify(e.target.value);
                onChange("pipeline", ANALYSIS_OTHER);
                onChange("application", e.target.value);
              }}
              placeholder="Specify analysis type (Application)..."
              className={inputClass}
            />
          )}
          {errors.pipeline && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
              {errors.pipeline}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-sample-type" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Sample Type
            </label>
            <input
              id="analysis-sample-type"
              type="text"
              value={formState.sample_type}
              onChange={(e) => handleChange("sample_type", e.target.value)}
              placeholder="e.g., Bacteria"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-run-id" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              RUN ID
            </label>
            <input
              id="analysis-run-id"
              type="text"
              value={formState.run_id}
              onChange={(e) => handleChange("run_id", e.target.value)}
              placeholder="e.g., PGCV_NS_0059"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Client / project (text, unlinked) */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(<Layers className="w-3.5 h-3.5" />, "Client & Project")}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-client-name" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Client
          </label>
          <input
            id="analysis-client-name"
            type="text"
            value={formState.client_name}
            onChange={(e) => handleChange("client_name", e.target.value)}
            placeholder="Client name"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-client-type" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Client Type
            </label>
            <select
              id="analysis-client-type"
              value={formState.client_type}
              onChange={(e) => handleChange("client_type", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {CLIENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-external-client-id" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Client ID
            </label>
            <input
              id="analysis-external-client-id"
              type="text"
              value={formState.external_client_id}
              onChange={(e) => handleChange("external_client_id", e.target.value)}
              placeholder="CL-2024-128"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-external-project-id" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Project ID
          </label>
          <input
            id="analysis-external-project-id"
            type="text"
            value={formState.external_project_id}
            onChange={(e) => handleChange("external_project_id", e.target.value)}
            placeholder="P-2023-055"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-project" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Linked Project (optional)
          </label>
          <select
            id="analysis-project"
            value={formState.project_id}
            onChange={(e) => handleChange("project_id", e.target.value)}
            className={inputClass}
          >
            <option value="">Unlinked</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.client})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statuses */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(<Activity className="w-3.5 h-3.5" />, "Status")}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-status-analysis" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Status of Analysis
            </label>
            <select
              id="analysis-status-analysis"
              value={formState.status_of_analysis}
              onChange={(e) => handleChange("status_of_analysis", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {STATUS_OF_ANALYSIS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-status-completion" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Status of Completion
            </label>
            <select
              id="analysis-status-completion"
              value={formState.status_of_completion}
              onChange={(e) => handleChange("status_of_completion", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {STATUS_OF_COMPLETION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-status-submission" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Status of Submission
            </label>
            <select
              id="analysis-status-submission"
              value={formState.status_of_submission}
              onChange={(e) => handleChange("status_of_submission", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {STATUS_OF_SUBMISSION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Links & notes */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Links & Notes")}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-report-link" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Service Report Link
          </label>
          <input
            id="analysis-report-link"
            type="url"
            value={formState.service_report_link}
            onChange={(e) => handleChange("service_report_link", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-sequences-link" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Client Sequences Link
          </label>
          <input
            id="analysis-sequences-link"
            type="url"
            value={formState.client_sequences_link}
            onChange={(e) => handleChange("client_sequences_link", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-notes" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Notes / Remarks
          </label>
          <textarea
            id="analysis-notes"
            rows={3}
            value={formState.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Optional notes"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-y"
          />
        </div>
      </div>

      {/* Assignee optional */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(<User className="w-3.5 h-3.5" />, "Personnel (optional)")}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-assignee" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Assignee
          </label>
          <select
            id="analysis-assignee"
            value={formState.assignee}
            onChange={(e) => handleChange("assignee", e.target.value)}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {availableAssignees.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>
      </div>
    </SlideOverModal>
  );
}
