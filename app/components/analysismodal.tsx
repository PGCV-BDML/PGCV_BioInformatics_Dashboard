"use client";

import React from "react";
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
  formState,
  availableProjects,
  availablePipelines,
  availableAssignees,
  onClose,
  onChange,
  onSubmit,
}: AnalysisSidebarProps) {
  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="Run New Pipeline"
      subtitle="Fill in the parameters to initiate a pipeline analysis."
      onSubmit={onSubmit}
      submitLabel="Initialize Run"
    >
      {/* 1. Target Project Link */}
      <div className="space-y-2.5">
        {renderSectionLabel(
          <Layers className="w-3.5 h-3.5" />,
          "Project Context",
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Select Project
          </label>
          <select
            required
            value={formState.project_id}
            onChange={(e) => onChange("project_id", e.target.value)}
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
            <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Pipeline
            </label>
            <select
              required
              value={formState.pipeline}
              onChange={(e) => onChange("pipeline", e.target.value)}
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Version
            </label>
            <input
              type="text"
              required
              value={formState.pipeline_version}
              onChange={(e) => onChange("pipeline_version", e.target.value)}
              placeholder="e.g., v1.0.0"
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
            />
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
          <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Assignee
          </label>
          <select
            required
            value={formState.assignee}
            onChange={(e) => onChange("assignee", e.target.value)}
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
        </div>
      </div>

      {/* 4. Initial Status */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Activity className="w-3.5 h-3.5" />,
          "Initial Status",
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Status
          </label>
          <select
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
