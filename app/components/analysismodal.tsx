"use client";

import React from "react";
import { X, Save, User, Activity, GitBranch, Layers, Dna } from "lucide-react";

export type AnalysisFormState = {
  project_id: string;
  pipeline: string;
  pipeline_version: string;
  assignee: string;
  status: "for_approval" | "ongoing" | "on_hold" | "submitted" | "completed";
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
  onChange: (key: keyof AnalysisFormState, value: any) => void;
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
  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] mb-2 mt-0.5 font-quicksand">
      {icon} <span>{text}</span>
    </div>
  );

  return (
    <>
      {/* Backdrop overlay transparently handling layout actions without darkening background */}
      <div
        onClick={onClose}
        className={`fixed inset-0 w-screen h-screen z-[90] bg-transparent transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar Container transforming smoothly from the right side of the screen workspace */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-[0_0_40px_0_rgba(15,23,42,0.12)] z-[100] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Dynamic decorative visual accent bar */}
        <div className="h-1.5 w-full bg-[#4ec2bb]" />

        {/* Sidebar Header Area */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-slate-100 bg-[#ffffff]">
          <div>
            <h3 className="text-lg font-bold text-[#2a7797] tracking-tight font-aileron">
              Run New Pipeline
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5 font-semibold font-aileron">
              Fill in the parameters to initiate a pipeline analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Scrollable Form Body */}
        <form
          onSubmit={onSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
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
                onChange={(e) => onChange("status", e.target.value as any)}
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

          {/* Sticky Form Action Footer */}
          <div className="flex gap-2.5 justify-end pt-5 pb-1 border-t border-slate-100 bg-[#ffffff]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors font-aileron"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md shadow-slate-400/20 transition-all font-aileron"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Initialize Run</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
