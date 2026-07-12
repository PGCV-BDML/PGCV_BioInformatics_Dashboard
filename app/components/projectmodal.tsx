"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Save,
  ClipboardCheck,
  FlaskConical,
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

  const handleInputChange = (key: keyof ProjectFormData, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

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
              {isAdding ? "Add New Project" : "Modify Project Details"}
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5 font-semibold font-aileron">
              Update registry profiles, milestone deadlines, and core task
              references.
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
          onSubmit={handleSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
        >
          {/* SECTION 1: core identity */}
          <div className="space-y-2.5">
            {renderSectionLabel(
              <ClipboardCheck className="w-3.5 h-3.5" />,
              "Project Scope",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Project Name
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., De Novo Transcriptome Assembly Pipeline"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Client Affiliation
                </label>
                <select
                  value={formState.client_name}
                  onChange={(e) =>
                    handleInputChange("client_name", e.target.value)
                  }
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                >
                  {availableClients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Service Classification
                </label>
                <select
                  value={formState.service_type}
                  onChange={(e) =>
                    handleInputChange("service_type", e.target.value)
                  }
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
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
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <FlaskConical className="w-3.5 h-3.5" />,
              "Management & Status",
            )}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Assigned Lead
                </label>
                <select
                  value={formState.lead}
                  onChange={(e) => handleInputChange("lead", e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                >
                  {availableUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Lifecycle Status
                </label>
                <select
                  value={formState.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
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
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <Calendar className="w-3.5 h-3.5" />,
              "Timeline Deadlines",
            )}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Commencement Date
                </label>
                <input
                  type="date"
                  required
                  value={formState.start_date}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Target Delivery Date
                </label>
                <input
                  type="date"
                  required
                  value={formState.target_delivery_date}
                  onChange={(e) =>
                    handleInputChange("target_delivery_date", e.target.value)
                  }
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: source tracking links */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <Link2 className="w-3.5 h-3.5" />,
              "Repository Assets",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                VCS Repository URL
              </label>
              <input
                type="url"
                value={formState.repository_link}
                onChange={(e) =>
                  handleInputChange("repository_link", e.target.value)
                }
                placeholder="https://github.com/..."
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
              />
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
              <span>{isAdding ? "Register Project" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
