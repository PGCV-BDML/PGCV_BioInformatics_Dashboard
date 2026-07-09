"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Save,
  ClipboardCheck,
  FlaskConical,
  User,
  Calendar,
  Link2,
} from "lucide-react";

type ProjectFormData = {
  name: string;
  client_name: string;
  service_type: string;
  status: string;
  lead: string;
  start_date: string;
  target_delivery_date: string;
  repository_link: string;
};

const EMPTY_FORM: ProjectFormData = {
  name: "",
  client_name: "",
  service_type: "",
  status: "On-going",
  lead: "",
  start_date: "",
  target_delivery_date: "",
  repository_link: "",
};

interface ProjectModalProps {
  isOpen: boolean;
  isAdding: boolean;
  initialData: ProjectFormData | null;
  availableClients: string[];
  availableServices: string[];
  availableUsers: string[];
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

export default function ProjectModal({
  isOpen,
  isAdding,
  initialData,
  availableClients,
  availableServices,
  availableUsers,
  onClose,
  onSubmit,
}: ProjectModalProps) {
  const [formState, setFormState] = useState<ProjectFormData>(EMPTY_FORM);

  // Sync internal state when initialData changes or switching modes
  useEffect(() => {
    if (isOpen) {
      setFormState(
        initialData || {
          ...EMPTY_FORM,
          client_name: availableClients[0] || "",
          service_type: availableServices[0] || "",
          lead: availableUsers[0] || "",
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

  if (!isOpen) return null;

  const handleInputChange = (key: keyof ProjectFormData, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[1.5px] mb-3 mt-1">
      {icon} <span>{text}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2a7797] via-[#4ec2bb] to-[#2a7797]" />

        {/* Modal Header */}
        <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-[#ffffff]">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isAdding ? "Add New Project" : "Modify Project Details"}
            </h3>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Update registry profiles, milestone deadlines, and core task
              references.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Form Input Stack */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar"
        >
          {/* SECTION 1: core identity */}
          <div className="space-y-4">
            {renderSectionLabel(
              <ClipboardCheck className="w-3.5 h-3.5" />,
              "Project Scope",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">
                Project Name
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., De Novo Transcriptome Assembly Pipeline"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Client Affiliation
                </label>
                <select
                  value={formState.client_name}
                  onChange={(e) =>
                    handleInputChange("client_name", e.target.value)
                  }
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  {availableClients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Service Classification
                </label>
                <select
                  value={formState.service_type}
                  onChange={(e) =>
                    handleInputChange("service_type", e.target.value)
                  }
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  {availableServices.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: personnel and progression status */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {renderSectionLabel(
              <FlaskConical className="w-3.5 h-3.5" />,
              "Management & Status",
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Assigned Lead
                </label>
                <select
                  value={formState.lead}
                  onChange={(e) => handleInputChange("lead", e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  {availableUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Lifecycle Status
                </label>
                <select
                  value={formState.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  <option value="On-going">On-going</option>
                  <option value="For approval">For Approval</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Completed">Completed</option>
                  <option value="On hold">On hold</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: operational timelines */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {renderSectionLabel(
              <Calendar className="w-3.5 h-3.5" />,
              "Timeline Deadlines",
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Commencement Date
                </label>
                <input
                  type="date"
                  required
                  value={formState.start_date}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Target Delivery Date
                </label>
                <input
                  type="date"
                  required
                  value={formState.target_delivery_date}
                  onChange={(e) =>
                    handleInputChange("target_delivery_date", e.target.value)
                  }
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: source tracking links */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {renderSectionLabel(
              <Link2 className="w-3.5 h-3.5" />,
              "Repository Assets",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">
                VCS Repository URL
              </label>
              <input
                type="url"
                value={formState.repository_link}
                onChange={(e) =>
                  handleInputChange("repository_link", e.target.value)
                }
                placeholder="https://github.com/..."
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Modal Action Options */}
          <div className="flex gap-3 justify-end pt-6 pb-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 h-12 px-6 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-lg shadow-slate-200 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>
                {isAdding ? "Register Project" : "Save Structural Changes"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
