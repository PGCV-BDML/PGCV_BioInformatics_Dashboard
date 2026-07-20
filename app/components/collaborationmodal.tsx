"use client";

import React, { useState } from "react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import {
  FlaskConical,
  User,
  Link2,
  Calendar,
  Activity,
  GitBranch,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { UserOption } from "../../types/database";

type FormState = {
  partner_org: string;
  lead_user_id: string;
  documents_links: string[];
  notes: string;
  start_date: string;
  status: string;
  repository_link: string;
};

interface CollaborationSidebarProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving?: boolean;
  submitDisabled?: boolean;
  formState: FormState;
  availableUsers: UserOption[];
  onClose: () => void;
  onChange: (key: keyof FormState, value: string | number | string[] | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CollaborationSidebar({
  isOpen,
  isAdding,
  isSaving,
  submitDisabled,
  formState,
  availableUsers,
  onClose,
  onChange,
  onSubmit,
}: CollaborationSidebarProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.partner_org.trim()) errs.partner_org = "Partner organization is required";
    if (!formState.lead_user_id) errs.lead_user_id = "Please select a lead coordinator";
    if (!formState.start_date) errs.start_date = "Start date is required";
    if (formState.repository_link && !/^https?:\/\//.test(formState.repository_link)) {
      errs.repository_link = "Must be a valid URL starting with http:// or https://";
    }
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

  const handleDocLinkChange = (index: number, value: string) => {
    const updatedLinks = [...formState.documents_links];
    updatedLinks[index] = value;
    onChange("documents_links", updatedLinks);
  };

  const addDocLinkField = () => {
    onChange("documents_links", [...formState.documents_links, ""]);
  };

  const removeDocLinkField = (index: number) => {
    const updatedLinks = formState.documents_links.filter(
      (_, i) => i !== index,
    );
    onChange("documents_links", updatedLinks);
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdding ? "Add New Collaboration" : "Modify Collaboration"}
      subtitle="Fill in the information required by the registry."
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
      submitDisabled={submitDisabled}
    >
      {/* 1. Partner Organization */}
      <div className="space-y-2.5">
        {renderSectionLabel(
          <FlaskConical className="w-3.5 h-3.5" />,
          "Identity & Core Details",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collab-partner-org" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Partner Organization
          </label>
          <input
            id="collab-partner-org"
            type="text"
            required
            aria-invalid={!!errors.partner_org}
            value={formState.partner_org}
            onChange={(e) => {
              onChange("partner_org", e.target.value);
              setErrors((prev) => ({ ...prev, partner_org: "" }));
            }}
            placeholder="e.g., Philippine Genome Center"
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
          />
          {errors.partner_org && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.partner_org}</p>
          )}
        </div>
      </div>

      {/* 2. Lead Coordinator */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(<User className="w-3.5 h-3.5" />, "Assignment")}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collab-lead-coordinator" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Lead Coordinator
          </label>
          <select
            id="collab-lead-coordinator"
            required
            aria-invalid={!!errors.lead_user_id}
            value={formState.lead_user_id}
            onChange={(e) => {
              onChange("lead_user_id", e.target.value);
              setErrors((prev) => ({ ...prev, lead_user_id: "" }));
            }}
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
          {errors.lead_user_id && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.lead_user_id}</p>
          )}
        </div>
      </div>

      {/* 3. Status */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Activity className="w-3.5 h-3.5" />,
          "Lifecycle Status",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collab-status" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Status
          </label>
          <select
            id="collab-status"
            required
            value={formState.status}
            onChange={(e) => onChange("status", e.target.value)}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          >
            <option value="" disabled className="text-slate-400 font-bold">
              Select context status
            </option>
            <option
              value="for_approval"
              className="text-slate-800 font-bold"
            >
              For Approval
            </option>
            <option value="ongoing" className="text-slate-800 font-bold">
              On-going
            </option>
            <option value="finished" className="text-slate-800 font-bold">
              Finished
            </option>
          </select>
        </div>
      </div>

      {/* 4. Start Date */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100">
        {renderSectionLabel(
          <Calendar className="w-3.5 h-3.5" />,
          "Timeline",
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collab-start-date" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
            Start Date
          </label>
          <input
            id="collab-start-date"
            type="date"
            required
            aria-invalid={!!errors.start_date}
            value={formState.start_date}
            onChange={(e) => {
              onChange("start_date", e.target.value);
              setErrors((prev) => ({ ...prev, start_date: "" }));
            }}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 transition-all shadow-sm"
          />
          {errors.start_date && (
            <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.start_date}</p>
          )}
        </div>
      </div>

      {/* Resources & Additional Information Divider wrapper */}
      <div className="space-y-3.5 pt-3 border-t border-slate-100">
        {renderSectionLabel(
          <Link2 className="w-3.5 h-3.5" />,
          "Resources & Details",
        )}
        <div className="flex flex-col gap-3.5">
          {/* 5. Documents Links */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-slate-800 font-aileron flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Documents Links
              </label>
              <button
                type="button"
                onClick={addDocLinkField}
                className="flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#4ec2bb] uppercase font-aileron"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>

            {formState.documents_links.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => handleDocLinkChange(idx, e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
                />
                {formState.documents_links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDocLinkField(idx)}
                    className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 6. Repository Link */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 ml-1 font-aileron">
              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
              <span>Repository Link</span>
            </div>
            <input
              type="url"
              aria-invalid={!!errors.repository_link}
              value={formState.repository_link}
              onChange={(e) => {
                onChange("repository_link", e.target.value);
                setErrors((prev) => ({ ...prev, repository_link: "" }));
              }}
              placeholder="https://github.com/..."
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm"
            />
            {errors.repository_link && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">{errors.repository_link}</p>
            )}
          </div>

          {/* 7. Notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="collab-notes" className="text-xs font-bold text-slate-800 ml-1 font-aileron">
              Notes
            </label>
            <textarea
              id="collab-notes"
              rows={3}
              value={formState.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              placeholder="Additional details regarding the collaboration"
              className="w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-none"
            />
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
