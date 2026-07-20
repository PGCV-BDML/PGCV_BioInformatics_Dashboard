"use client";

import React, { useState } from "react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { User, Activity, Layers, Dna } from "lucide-react";
import type { AnalysisStatus } from "@/types/database";

export type AnalysisFormState = {
  project_id: string;
  pipeline: string;
  pipeline_version: string;
  assignee: string;
  status: AnalysisStatus;
};

interface ProjectOption {
  id: string;
  name: string;
  client: string;
}

interface AnalysisSidebarProps {
  isOpen: boolean;
  isSaving?: boolean;
  formState: AnalysisFormState;
  availableProjects: ProjectOption[];
  availablePipelines: string[];
  availableAssignees: string[];
  onClose: () => void;
  onChange: (key: keyof AnalysisFormState, value: string | number | string[] | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AnalysisSidebar({
  isOpen,
  isSaving = false,
  formState,
  availableProjects,
  availablePipelines,
  availableAssignees,
  onClose,
  onChange,
  onSubmit,
}: AnalysisSidebarProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.project_id) errs.project_id = "Please select a project";
    if (!formState.pipeline) errs.pipeline = "Please select a pipeline";
    if (!formState.pipeline_version.trim()) errs.pipeline_version = "Version is required";
    if (!formState.assignee) errs.assignee = "Please select an assignee";
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

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="Run New Pipeline"
      subtitle="Fill in the parameters to initiate a pipeline analysis."
      onSubmit={handleSubmit}
      submitLabel="Initialize Run"
      isSaving={isSaving}
      submitDisabled={isSaving}
    >
      {/* 1. Target Project Link */}
      <div className="space-y-2.5">
        {renderSectionLabel(
          <Layers className="w-3.5 h-3.5" />,
          "Project Context",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-project" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Select Project
          </label>
          <select
            id="analysis-project"
            required
            aria-invalid={!!errors.project_id}
            value={formState.project_id}
            onChange={(e) => handleChange("project_id", e.target.value)}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          >
            <option value="" disabled className="text-slate-400 font-bold">
              Select a project...
            </option>
            {availableProjects.map((project) => (
              <option
                key={project.id}
                value={project.id}
                className="text-slate-800 font-bold"
              >
                {project.name} ({project.client})
              </option>
            ))}
          </select>
          {errors.project_id && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.project_id}</p>
          )}
        </div>
      </div>

      {/* 2. Pipeline Configuration */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Dna className="w-3.5 h-3.5" />,
          "Analysis Pipeline",
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-pipeline" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Pipeline
            </label>
            <select
              id="analysis-pipeline"
              required
              aria-invalid={!!errors.pipeline}
              value={formState.pipeline}
              onChange={(e) => handleChange("pipeline", e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              <option
                value=""
                disabled
                className="text-slate-400 font-bold"
              >
                Select pipeline...
              </option>
              {availablePipelines.map((pipeline) => (
                <option
                  key={pipeline}
                  value={pipeline}
                  className="text-slate-800 font-bold"
                >
                  {pipeline}
                </option>
              ))}
            </select>
            {errors.pipeline && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.pipeline}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-version" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Version
            </label>
            <input
              id="analysis-version"
              type="text"
              required
              aria-invalid={!!errors.pipeline_version}
              value={formState.pipeline_version}
              onChange={(e) => handleChange("pipeline_version", e.target.value)}
              placeholder="e.g., v1.0.0"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
            />
            {errors.pipeline_version && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.pipeline_version}</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Assignee */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <User className="w-3.5 h-3.5" />,
          "Personnel Assignment",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-assignee" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Assignee
          </label>
          <select
            id="analysis-assignee"
            required
            aria-invalid={!!errors.assignee}
            value={formState.assignee}
            onChange={(e) => handleChange("assignee", e.target.value)}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          >
            <option value="" disabled className="text-slate-400 font-bold">
              Select lead scientist
            </option>
            {availableAssignees.map((user) => (
              <option
                key={user}
                value={user}
                className="text-slate-800 font-bold"
              >
                {user}
              </option>
            ))}
          </select>
          {errors.assignee && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.assignee}</p>
          )}
        </div>
      </div>

      {/* 4. Initial Status */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Activity className="w-3.5 h-3.5" />,
          "Initial Status",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="analysis-status" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Status
          </label>
          <select
            id="analysis-status"
            required
            value={formState.status}
            onChange={(e) => onChange("status", e.target.value as AnalysisStatus)}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          >
          <option value="for_approval" className="text-slate-800 font-bold">
            For Approval
          </option>
          <option value="ongoing" className="text-slate-800 font-bold">
            On-going
          </option>
          <option value="on_hold" className="text-slate-800 font-bold">
            On Hold
          </option>
          <option value="submitted" className="text-slate-800 font-bold">
            Submitted
          </option>
          <option value="completed" className="text-slate-800 font-bold">
            Completed
          </option>
          </select>
        </div>
      </div>
    </SlideOverModal>
  );
}
