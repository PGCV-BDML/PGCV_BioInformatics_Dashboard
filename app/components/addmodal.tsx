"use client";

import { useState } from "react";
import {
  X,
  Save,
  Link2,
  FlaskConical,
  User,
  Calendar,
  ClipboardCheck,
} from "lucide-react";

type ProjectInput = {
  name: string;
  client_name: string;
  service_type: string;
  status: string;
  lead: string;
  start_date: string;
  target_delivery_date: string;
  repository_link: string;
};

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: ProjectInput) => void;
  availableClients: string[];
  availableServices: string[];
  availableUsers: string[];
}

export default function NewProjectModal({
  isOpen,
  onClose,
  onSubmit,
  availableClients,
  availableServices,
  availableUsers,
}: NewProjectModalProps) {
  const initialFormState: ProjectInput = {
    name: "",
    client_name: "",
    service_type: "",
    status: "On-going",
    lead: "",
    start_date: "",
    target_delivery_date: "",
    repository_link: "",
  };

  const [form, setForm] = useState<ProjectInput>(initialFormState);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm(initialFormState); // Reset form values after submit
  };

  if (!isOpen) return null;

  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[1.5px] mb-3 mt-1">
      {icon} <span>{text}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300">
      {/* Modal Card Box wrapper */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* Top Gradient Stripe Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2a7797] via-[#4ec2bb] to-[#2a7797]" />

        {/* Modal Header Container */}
        <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-white">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              Initialize New Project
            </h3>
            <p className="text-slate-500 text-sm mt-1 font-medium font-aileron">
              Define target parameter settings for the custom sequence pipeline
              assignment.
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

        {/* Modal Form Content Scrollable Body View */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar"
        >
          {/* SECTION 1: Identity Profile Card Parameters */}
          <div className="space-y-3">
            {renderSectionLabel(
              <ClipboardCheck className="w-3.5 h-3.5" />,
              "Project Identity",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">
                Project Title / Assignment Label
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g., De Novo Transcriptome Assembly Pipeline"
                value={form.name}
                onChange={handleInputChange}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* SECTION 2: Node Routing Classifications */}
          <div className="space-y-3">
            {renderSectionLabel(
              <FlaskConical className="w-3.5 h-3.5" />,
              "Classification & Workflow Protocol",
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Selector mapping block */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Client Entity Account
                </label>
                <select
                  name="client_name"
                  required
                  value={form.client_name}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  <option value="" disabled className="text-slate-400">
                    Select Client Profile Node
                  </option>
                  {availableClients.map((client) => (
                    <option key={client} value={client} className="text-black">
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type mapping configuration block */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Service Pipeline Route
                </label>
                <select
                  name="service_type"
                  required
                  value={form.service_type}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  <option value="" disabled className="text-slate-400">
                    Select Protocol Template
                  </option>
                  {availableServices.map((service) => (
                    <option
                      key={service}
                      value={service}
                      className="text-black"
                    >
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Operations Logistics / Coordinators */}
          <div className="space-y-3">
            {renderSectionLabel(
              <User className="w-3.5 h-3.5" />,
              "Personnel Allocation & Operational Timeline",
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Lead System Analyst / Coordinator
                </label>
                <select
                  name="lead"
                  required
                  value={form.lead}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  <option value="" disabled className="text-slate-400">
                    Assign Accountable Personnel
                  </option>
                  {availableUsers.map((user) => (
                    <option key={user} value={user} className="text-black">
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pipeline Status Row inside operations segment block */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Pipeline Operational State
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                >
                  <option value="On-going" className="text-black">
                    On-going / In-Progress
                  </option>
                  <option value="Completed" className="text-black">
                    Completed
                  </option>
                  <option value="On hold" className="text-black">
                    On hold / Overdue
                  </option>
                  <option value="Submitted" className="text-black">
                    Submitted
                  </option>
                  <option value="For approval" className="text-black">
                    For approval
                  </option>
                </select>
              </div>

              {/* Commencement Tracking Fields */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 ml-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <label className="text-sm font-bold">Commencement Date</label>
                </div>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={form.start_date}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                />
              </div>

              {/* Deadline Target Parameter Context inputs */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 ml-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <label className="text-sm font-bold">Delivery Deadline</label>
                </div>
                <input
                  type="date"
                  name="target_delivery_date"
                  required
                  value={form.target_delivery_date}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Repository Remote Assets Context Sync parameters */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-800 ml-1 mb-1">
              <Link2 className="w-4 h-4 text-[#2a7797]" />
              <label className="text-sm font-bold">
                Remote Linked Repository (Optional)
              </label>
            </div>
            <input
              type="url"
              name="repository_link"
              placeholder="https://github.com/username/repository-signature"
              value={form.repository_link}
              onChange={handleInputChange}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Action Navigation Footer Layout Layer links buttons group */}
          <div className="flex gap-3 justify-end pt-6 pb-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 h-12 px-6 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-lg shadow-slate-200 transition-all"
            >
              <Save className="w-4 h-4" /> Save Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
