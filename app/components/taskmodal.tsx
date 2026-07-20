"use client";
//taskmodal.tsx
import React, { useState } from "react";
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) errs.title = "Task description is required";
    if (!formState.linked_project_id) errs.linked_project_id = "Please select a linked project";
    if (!formState.assignee_id) errs.assignee_id = "Please select an assignee";
    if (!formState.due_date) errs.due_date = "Due date is required";
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

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    onInputChange(e);
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add New Task" : "Modify Task"}
      subtitle="Fill in the information required by the registry."
      onSubmit={handleSubmit}
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
          <label htmlFor="task-description" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Task Description
          </label>
          <input
            id="task-description"
            type="text"
            name="title"
            required
            aria-invalid={!!errors.title}
            value={formState.title}
            onChange={handleFieldChange}
            placeholder="e.g., Run downstream validation scripts against assemblies"
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
          {errors.title && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.title}</p>
          )}
        </div>
      </div>

      {/* Section: Project */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Briefcase className="w-3.5 h-3.5" />,
          "Project",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-linked-project" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Linked Project
          </label>
          <select
            id="task-linked-project"
            name="linked_project_id"
            required
            aria-invalid={!!errors.linked_project_id}
            value={formState.linked_project_id ?? ""}
            onChange={handleFieldChange}
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
          {errors.linked_project_id && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.linked_project_id}</p>
          )}
        </div>
      </div>

      {/* Section: Assignment */}
      <div className="space-y-3.5 pt-3 border-t border-slate-100">
        {renderSectionLabel(<User className="w-3.5 h-3.5" />, "Assignment")}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-assignee" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Assignee
            </label>
            <select
              id="task-assignee"
              name="assignee_id"
              required
              aria-invalid={!!errors.assignee_id}
              value={formState.assignee_id}
              onChange={handleFieldChange}
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
            {errors.assignee_id && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.assignee_id}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-priority" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Priority
            </label>
            <select
              id="task-priority"
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
            <label htmlFor="task-status" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Status
            </label>
            <select
              id="task-status"
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
            <label htmlFor="task-due-date" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Due Date
            </label>
            <input
              id="task-due-date"
              type="date"
              name="due_date"
              required
              aria-invalid={!!errors.due_date}
              value={formState.due_date ?? ""}
              onChange={handleFieldChange}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            />
            {errors.due_date && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.due_date}</p>
            )}
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
