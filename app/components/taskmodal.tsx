"use client";
//taskmodal.tsx
import React from "react";
import { Task, TaskStatus, TaskPriority } from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import {
  ClipboardCheck,
  Briefcase,
  User,
  Calendar,
} from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving?: boolean;
  formState: Omit<Task, "id">;
  availableProjects: { id: string; name: string }[];
  availableUsers: { id: string; name: string }[];
  statusOptions: { value: TaskStatus; label: string }[];
  priorityOptions: { value: TaskPriority; label: string }[];
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TaskModal({
  isOpen,
  isAdding,
  isSaving = false,
  formState,
  availableProjects,
  availableUsers,
  statusOptions,
  priorityOptions,
  onInputChange,
  onClose,
  onSubmit,
}: TaskModalProps) {
  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add New Task" : "Modify Task"}
      subtitle="Fill in the information required by the registry."
      onSubmit={onSubmit}
      submitLabel="Save"
      isSaving={isSaving}
      submitDisabled={isSaving}
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
            name="linked_project_id"
            required
            value={formState.linked_project_id ?? ""}
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
              name="assignee_id"
              required
              value={formState.assignee_id}
              onChange={onInputChange}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              {availableUsers.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                  className="text-slate-800 font-bold"
                >
                  {user.name}
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
                  key={prio.value}
                  value={prio.value}
                  className="text-slate-800 font-bold"
                >
                  {prio.label}
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
                  key={status.value}
                  value={status.value}
                  className="text-slate-800 font-bold"
                >
                  {status.label}
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
              value={formState.due_date ?? ""}
              onChange={onInputChange}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
