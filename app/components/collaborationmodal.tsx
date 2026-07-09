"use client";

import React from "react";
import { X, Save, FlaskConical, User, Link2 } from "lucide-react";
import { UserOption } from "../../types/database";

type FormState = {
  partner_org: string;
  lead_user_id: string;
  documents_link: string;
  notes: string;
};

interface CollaborationModalProps {
  isOpen: boolean;
  isAdding: boolean;
  formState: FormState;
  availableUsers: UserOption[];
  onClose: () => void;
  onChange: (key: keyof FormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CollaborationModal({
  isOpen,
  isAdding,
  formState,
  availableUsers,
  onClose,
  onChange,
  onSubmit,
}: CollaborationModalProps) {
  if (!isOpen) return null;

  // Consistent section header helper
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
              {isAdding ? "Add New Collaboration" : "Modify Collaboration"}
            </h3>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Fill in the information required by the collaboration registry.
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

        {/* Modal Form */}
        <form
          onSubmit={onSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar"
        >
          {/* Section: Identity */}
          <div className="space-y-3">
            {renderSectionLabel(
              <FlaskConical className="w-3.5 h-3.5" />,
              "Identity",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">
                Partner Organization
              </label>
              <input
                type="text"
                required
                value={formState.partner_org}
                onChange={(e) => onChange("partner_org", e.target.value)}
                placeholder="e.g., Philippine Genome Center"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Section: Assignment */}
          <div className="space-y-3">
            {renderSectionLabel(<User className="w-3.5 h-3.5" />, "Assignment")}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-800 ml-1">
                Lead Coordinator
              </label>
              <select
                value={formState.lead_user_id}
                onChange={(e) => onChange("lead_user_id", e.target.value)}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
              >
                <option value="" disabled className="text-slate-400">
                  Select a coordinator
                </option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id} className="text-black">
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Resources */}
          <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
            {renderSectionLabel(
              <Link2 className="w-3.5 h-3.5" />,
              "Resources & Details",
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Documents Link
                </label>
                <input
                  type="url"
                  value={formState.documents_link}
                  onChange={(e) => onChange("documents_link", e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 ml-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formState.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                  placeholder="Additional details or repository links"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
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
              <span>{isAdding ? "Save Collaboration" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
