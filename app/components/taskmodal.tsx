"use client";

import React from "react";
import {
  X,
  Save,
  ClipboardCheck,
  Briefcase,
  User,
  Calendar,
} from "lucide-react";

type Task = {
  id: number;
  title: string;
  assignee: string;
  due_date: string;
  status: string;
  priority: string;
  project_id: number;
};

interface TaskModalProps {
  isOpen: boolean;
  isAdding: boolean;
  formState: Omit<Task, "id">;
  availableProjects: { id: number; name: string }[];
  availableUsers: string[];
  statusOptions: string[];
  priorityOptions: string[];
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TaskModal({
  isOpen,
  isAdding,
  formState,
  availableProjects,
  availableUsers,
  statusOptions,
  priorityOptions,
  onInputChange,
  onClose,
  onSubmit,
}: TaskModalProps) {
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
        className={`fixed inset-0 w-screen h-screen z-[90] bg-transparent transition-all duration-300 ease-in-out ${isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }`}
      />

      {/* Sidebar Container transforming smoothly from the right side of the screen workspace */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-[0_0_40px_0_rgba(15,23,42,0.12)] z-[100] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Dynamic decorative visual accent bar */}
        <div className="h-1.5 w-full bg-[#4ec2bb]" />

        {/* Sidebar Header Area */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-slate-100 bg-[#ffffff]">
          <div>
            <h3 className="text-lg font-bold text-[#2a7797] tracking-tight font-aileron">
              {isAdding ? "Add New Task" : "Modify Task"}
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5 font-semibold font-aileron">
              Fill in the information required by the registry.
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

        {/* Sidebar Scrollable Form Body Context */}
        <form
          onSubmit={onSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
        >
          {/* Section: Identity */}
          <div className="space-y-2.5">
            {renderSectionLabel(
              <ClipboardCheck className="w-3.5 h-3.5" />,
              "Identity",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Task Description
              </label>
              <input
                type="text"
                name="title"
                required
                value={formState.title}
                onChange={onInputChange}
                placeholder="e.g., Run downstream validation scripts against assemblies"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Section: Project */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <Briefcase className="w-3.5 h-3.5" />,
              "Project",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Linked Project
              </label>
              <select
                name="project_id"
                required
                value={formState.project_id}
                onChange={onInputChange}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
              >
                {availableProjects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                    className="text-slate-800 font-bold"
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Assignment */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            {renderSectionLabel(<User className="w-3.5 h-3.5" />, "Assignment")}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Assignee
                </label>
                <select
                  name="assignee"
                  required
                  value={formState.assignee}
                  onChange={onInputChange}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                >
                  {availableUsers.map((user) => (
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Priority
                </label>
                <select
                  name="priority"
                  required
                  value={formState.priority}
                  onChange={onInputChange}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                >
                  {priorityOptions.map((prio) => (
                    <option
                      key={prio}
                      value={prio}
                      className="text-slate-800 font-bold"
                    >
                      {prio}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Timeline */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            {renderSectionLabel(
              <Calendar className="w-3.5 h-3.5" />,
              "Timeline",
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Status
                </label>
                <select
                  name="status"
                  required
                  value={formState.status}
                  onChange={onInputChange}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                >
                  {statusOptions.map((status) => (
                    <option
                      key={status}
                      value={status}
                      className="text-slate-800 font-bold"
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  required
                  value={formState.due_date}
                  onChange={onInputChange}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Form Sticky Action Footer controls */}
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
              <span>{isAdding ? "Save" : "Save"}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
