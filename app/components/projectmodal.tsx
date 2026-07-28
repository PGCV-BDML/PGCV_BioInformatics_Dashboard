"use client";

import React, { useEffect, useState } from "react";
import { UserOption, Project, ProjectFormData, ProjectStatus, STATUS_OPTIONS } from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import {
  ClipboardCheck,
  FlaskConical,
  Calendar,
  Link2,
} from "lucide-react";

const EMPTY_FORM: ProjectFormData = {
  name: "",
  client_id: "",
  service_id: "",
  status: "ongoing",
  lead_user_id: "",
  start_date: "",
  target_delivery_date: "",
  repository_link: "",
};

interface ProjectModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: ProjectFormData | null;
  availableClients: UserOption[];
  availableServices: UserOption[];
  availableUsers: UserOption[];
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

export default function ProjectModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  availableClients,
  availableServices,
  availableUsers,
  onClose,
  onSubmit,
}: ProjectModalProps) {
  const [formState, setFormState] = useState<ProjectFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.name.trim()) errs.name = "Project name is required";
    if (!formState.client_id) errs.client_id = "Please select a client";
    if (!formState.service_id) errs.service_id = "Please select a service category";
    if (!formState.lead_user_id) errs.lead_user_id = "Please select a lead";
    if (!formState.start_date) errs.start_date = "Start date is required";
    if (formState.repository_link && !/^https?:\/\//.test(formState.repository_link)) {
      errs.repository_link = "Must be a valid URL starting with http:// or https://";
    }
    if (formState.start_date && formState.target_delivery_date && formState.target_delivery_date < formState.start_date) {
      errs.target_delivery_date = "Delivery date must be on or after start date";
    }
    return errs;
  };

  useEffect(() => {
    if (isOpen) {
      setFormState(
        initialData || {
          ...EMPTY_FORM,
          client_id: availableClients[0]?.id || "",
          service_id: availableServices[0]?.id || "",
          lead_user_id: availableUsers[0]?.id || "",
        },
      );
    }
  }, [
    isOpen,
    initialData,
    availableClients,
    availableServices,
    availableUsers,
  ]);

  const handleInputChange = (key: keyof ProjectFormData, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(formState);
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add New Project" : "Modify Project Details"}
      subtitle="Update registry profiles, milestone deadlines, and core task references."
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
      submitDisabled={isSaving}
    >
      {/* SECTION 1: core identity */}
      <div className="space-y-2.5">
        {renderSectionLabel(
          <ClipboardCheck className="w-3.5 h-3.5" />,
          "Project Scope",
        )}

        {/* Project Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            required
            aria-invalid={!!errors.name}
            value={formState.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="e.g., De Novo Transcriptome Assembly Pipeline"
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
          {errors.name && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Client Affiliation */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-client" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Client
            </label>
            <select
              id="project-client"
              required
              aria-invalid={!!errors.client_id}
              value={formState.client_id}
              onChange={(e) =>
                handleInputChange("client_id", e.target.value)
              }
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              {availableClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.client_id}</p>
            )}
          </div>

          {/* Service Classification */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-service-category" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Service Category
            </label>
            <select
              id="project-service-category"
              required
              aria-invalid={!!errors.service_id}
              value={formState.service_id}
              onChange={(e) =>
                handleInputChange("service_id", e.target.value)
              }
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            {errors.service_id && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.service_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: personnel and progression status */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <FlaskConical className="w-3.5 h-3.5" />,
          "Management & Status",
        )}
        <div className="flex flex-col gap-3.5">
          {/* Assigned Lead */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-lead" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Lead
            </label>
            <select
              id="project-lead"
              required
              aria-invalid={!!errors.lead_user_id}
              value={formState.lead_user_id}
              onChange={(e) => handleInputChange("lead_user_id", e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            {errors.lead_user_id && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.lead_user_id}</p>
            )}
          </div>

          {/* Lifecycle Status */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-status" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Status
            </label>
            <select
              id="project-status"
              value={formState.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: operational timelines */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Calendar className="w-3.5 h-3.5" />,
          "Timeline Deadlines",
        )}
        <div className="flex flex-col gap-3.5">
          {/* Commencement Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-start-date" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Start Date
            </label>
            <input
              id="project-start-date"
              type="date"
              required
              aria-invalid={!!errors.start_date}
              value={formState.start_date}
              onChange={(e) =>
                handleInputChange("start_date", e.target.value)
              }
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            />
            {errors.start_date && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.start_date}</p>
            )}
          </div>

          {/* Target Delivery Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-delivery-date" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Delivery Date
            </label>
            <input
              id="project-delivery-date"
              type="date"
              aria-invalid={!!errors.target_delivery_date}
              value={formState.target_delivery_date}
              onChange={(e) =>
                handleInputChange("target_delivery_date", e.target.value)
              }
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
            />
            {errors.target_delivery_date && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.target_delivery_date}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: source tracking links */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Link2 className="w-3.5 h-3.5" />,
          "Repository Assets",
        )}
        {/* Repository Link */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-repository-link" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Repository Link
          </label>
          <input
            id="project-repository-link"
            type="url"
            aria-invalid={!!errors.repository_link}
            value={formState.repository_link}
            onChange={(e) =>
              handleInputChange("repository_link", e.target.value)
            }
            placeholder="https://github.com/..."
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
          {errors.repository_link && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.repository_link}</p>
          )}
        </div>
      </div>
    </SlideOverModal>
  );
}
