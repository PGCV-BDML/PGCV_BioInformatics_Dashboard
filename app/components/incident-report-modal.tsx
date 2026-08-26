"use client";

import React, { useState } from "react";
import {
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_LOCATION_OPTIONS,
  INCIDENT_SEVERITY_OPTIONS,
  INCIDENT_STATUS_OPTIONS,
  type IncidentCategory,
  type IncidentLocation,
  type IncidentReportFormData,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentStatusEvent,
} from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { AssigneeMultiSelect } from "./assignee-select";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  FileText,
  History,
  MapPin,
} from "lucide-react";
import { incidentStatusEventLabel } from "@/lib/incident-reports";

const inputClass =
  "w-full h-10 px-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed disabled:focus:ring-0 disabled:focus:border-slate-300/80";

const textareaClass =
  "w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-none disabled:opacity-70 disabled:cursor-not-allowed disabled:focus:ring-0 disabled:focus:border-slate-300/80";

interface IncidentReportModalProps {
  isOpen: boolean;
  isAdding: boolean;
  isSaving: boolean;
  initialData: IncidentReportFormData;
  staffUsers: { id: string; name: string }[];
  userNames: Record<string, string>;
  canEditDetails: boolean;
  canChangeStatus: boolean;
  canAssignPointPerson: boolean;
  statusEvents: IncidentStatusEvent[];
  statusEventsLoading?: boolean;
  onClose: () => void;
  onSubmit: (data: IncidentReportFormData) => void;
}

export default function IncidentReportModal({
  isOpen,
  isAdding,
  isSaving,
  initialData,
  staffUsers,
  userNames,
  canEditDetails,
  canChangeStatus,
  canAssignPointPerson,
  statusEvents,
  statusEventsLoading = false,
  onClose,
  onSubmit,
}: IncidentReportModalProps) {
  const [formState, setFormState] =
    useState<IncidentReportFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canSave = isAdding || canEditDetails || canChangeStatus;
  const lockDetails = !isAdding && !canEditDetails;
  const lockStatus = !isAdding && !canChangeStatus;
  const lockAssignment = !isAdding && !canAssignPointPerson;

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) errs.title = "Title is required";
    if (!formState.incident_date) errs.incident_date = "Date is required";
    if (!formState.description.trim()) {
      errs.description = "Describe what happened";
    }
    return errs;
  };

  const handleInputChange = <K extends keyof IncidentReportFormData>(
    key: K,
    value: IncidentReportFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(formState);
  };

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAdding
          ? "Log Incident Report"
          : canEditDetails
            ? "Edit Incident Report"
            : "Incident Report"
      }
      subtitle={
        isAdding
          ? "Staff-only log of what happened, when, and who should own the case."
          : canEditDetails
            ? "Update the record, assignment, or status."
            : canChangeStatus
              ? "Update status or follow-up notes for this case."
              : "Staff-only log of what happened, when, and what was done."
      }
      onSubmit={canSave ? handleSubmit : undefined}
      submitLabel="Save"
      isSaving={isSaving}
      submitDisabled={isSaving || !canSave}
      footer={
        canSave ? undefined : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors font-aileron"
            >
              Close
            </button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(
            <FileText className="w-3.5 h-3.5" />,
            "What happened",
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="incident-title"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Title
            </label>
            <input
              id="incident-title"
              type="text"
              aria-invalid={!!errors.title}
              value={formState.title}
              disabled={lockDetails}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g. Sample mix-up on extraction batch"
              className={inputClass}
            />
            {errors.title && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-category"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Category
              </label>
              <select
                id="incident-category"
                value={formState.category}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange(
                    "category",
                    e.target.value as IncidentCategory,
                  )
                }
                className={inputClass}
              >
                {INCIDENT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-severity"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Severity
              </label>
              <select
                id="incident-severity"
                value={formState.severity}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange(
                    "severity",
                    e.target.value as IncidentSeverity,
                  )
                }
                className={inputClass}
              >
                {INCIDENT_SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="incident-description"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Description
            </label>
            <textarea
              id="incident-description"
              rows={4}
              aria-invalid={!!errors.description}
              value={formState.description}
              disabled={lockDetails}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="What happened, who noticed it, and any impact."
              className={textareaClass}
            />
            {errors.description && (
              <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                {errors.description}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          {renderSectionLabel(
            <CalendarClock className="w-3.5 h-3.5" />,
            "When & where",
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-date"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Date
              </label>
              <input
                id="incident-date"
                type="date"
                aria-invalid={!!errors.incident_date}
                value={formState.incident_date}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange("incident_date", e.target.value)
                }
                className={inputClass}
              />
              {errors.incident_date && (
                <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
                  {errors.incident_date}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-time"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Time{" "}
                <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <input
                id="incident-time"
                type="time"
                value={formState.incident_time}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange("incident_time", e.target.value)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-location"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Location
              </label>
              <select
                id="incident-location"
                value={formState.location}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange(
                    "location",
                    e.target.value as IncidentLocation,
                  )
                }
                className={inputClass}
              >
                {INCIDENT_LOCATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-location-detail"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Location detail{" "}
                <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <input
                id="incident-location-detail"
                type="text"
                value={formState.location_detail}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange("location_detail", e.target.value)
                }
                placeholder="e.g. Lab 2, freezer A, or sequencer NS-1"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          {renderSectionLabel(
            <AlertTriangle className="w-3.5 h-3.5" />,
            "Immediate response",
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="incident-action"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Immediate action taken{" "}
              <span className="font-medium text-slate-400">(optional)</span>
            </label>
            <textarea
              id="incident-action"
              rows={3}
              value={formState.immediate_action}
              disabled={lockDetails}
              onChange={(e) =>
                handleInputChange("immediate_action", e.target.value)
              }
              placeholder="What was already done to contain or correct the issue."
              className={textareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="incident-people"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              People involved / witnesses{" "}
              <span className="font-medium text-slate-400">(optional)</span>
            </label>
            <input
              id="incident-people"
              type="text"
              value={formState.people_involved}
              disabled={lockDetails}
              onChange={(e) =>
                handleInputChange("people_involved", e.target.value)
              }
              placeholder="Names of people present or affected"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          {renderSectionLabel(
            <ClipboardCheck className="w-3.5 h-3.5" />,
            "Follow-up",
          )}

          <AssigneeMultiSelect
            selected={formState.point_person_id ? [formState.point_person_id] : []}
            users={staffUsers}
            onChange={(ids) =>
              handleInputChange("point_person_id", ids[0] ?? "")
            }
            max={1}
            disabled={lockAssignment}
            label="Point person"
            hint="Optional. Who should own this case? They are notified when you save, unless you assign yourself."
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-status"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Status
              </label>
              <select
                id="incident-status"
                value={formState.status}
                disabled={lockStatus}
                onChange={(e) =>
                  handleInputChange("status", e.target.value as IncidentStatus)
                }
                className={inputClass}
              >
                {INCIDENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incident-run-id"
                className="text-xs font-bold text-slate-800 ml-1 font-aileron"
              >
                Run ID{" "}
                <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <input
                id="incident-run-id"
                type="text"
                value={formState.related_run_id}
                disabled={lockDetails}
                onChange={(e) =>
                  handleInputChange("related_run_id", e.target.value)
                }
                placeholder="e.g. PGCV_NS_0059"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="incident-follow-up"
              className="text-xs font-bold text-slate-800 ml-1 font-aileron"
            >
              Follow-up notes{" "}
              <span className="font-medium text-slate-400">(optional)</span>
            </label>
            <textarea
              id="incident-follow-up"
              rows={3}
              value={formState.follow_up}
              disabled={lockStatus && lockDetails}
              onChange={(e) => handleInputChange("follow_up", e.target.value)}
              placeholder="Corrective actions, root cause, or next steps."
              className={textareaClass}
            />
          </div>

          <p className="text-[10px] text-slate-400 ml-1 font-aileron flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            Reporter is set automatically from the signed-in staff account.
          </p>
        </div>

        {!isAdding ? (
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {renderSectionLabel(
              <History className="w-3.5 h-3.5" />,
              "Case activity",
            )}
            {statusEventsLoading ? (
              <p className="text-[11px] text-slate-400 ml-1 font-aileron">
                Loading activity…
              </p>
            ) : statusEvents.length === 0 ? (
              <p className="text-[11px] text-slate-400 ml-1 font-aileron">
                No status history yet.
              </p>
            ) : (
              <ol className="space-y-2 ml-1">
                {statusEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold text-slate-700 font-aileron leading-relaxed">
                      {incidentStatusEventLabel(
                        event,
                        event.changed_by
                          ? userNames[event.changed_by]
                          : null,
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
    </SlideOverModal>
  );
}
