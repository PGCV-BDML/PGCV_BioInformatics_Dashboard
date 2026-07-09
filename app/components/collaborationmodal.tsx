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

interface CollaborationSidebarProps {
  isOpen: boolean;
  isAdding: boolean;
  formState: FormState;
  availableUsers: UserOption[];
  onClose: () => void;
  onChange: (key: keyof FormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CollaborationSidebar({
  isOpen,
  isAdding,
  formState,
  availableUsers,
  onClose,
  onChange,
  onSubmit,
}: CollaborationSidebarProps) {
  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[1.5px] mb-2 mt-0.5 font-quicksand">
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
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2a7797] via-[#4ec2bb] to-[#2a7797]" />

        {/* Sidebar Header Area - Tightened padding layout slightly */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-slate-100 bg-[#ffffff]">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-aileron">
              {isAdding ? "Add New Collaboration" : "Modify Collaboration"}
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

        {/* Sidebar Scrollable Form Body Context - Tightened internal layout structure padding */}
        <form
          onSubmit={onSubmit}
          className="bg-[#ffffff] flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
        >
          {/* Section: Identity */}
          <div className="space-y-2.5">
            {renderSectionLabel(
              <FlaskConical className="w-3.5 h-3.5" />,
              "Identity",
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Partner Organization
              </label>
              <input
                type="text"
                required
                value={formState.partner_org}
                onChange={(e) => onChange("partner_org", e.target.value)}
                placeholder="e.g., Philippine Genome Center"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Section: Assignment */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(<User className="w-3.5 h-3.5" />, "Assignment")}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                Lead Coordinator
              </label>
              <select
                value={formState.lead_user_id}
                onChange={(e) => onChange("lead_user_id", e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
              >
                <option value="" disabled className="text-slate-400 font-bold">
                  Select a coordinator
                </option>
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
          </div>

          {/* Section: Resources */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            {renderSectionLabel(
              <Link2 className="w-3.5 h-3.5" />,
              "Resources & Details",
            )}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Documents Link
                </label>
                <input
                  type="url"
                  value={formState.documents_link}
                  onChange={(e) => onChange("documents_link", e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-800 ml-1 font-aileron">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formState.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                  placeholder="Additional details or repository links"
                  className="w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-none"
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
              <span>{isAdding ? "Save" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
