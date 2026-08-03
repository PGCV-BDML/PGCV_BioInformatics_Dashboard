"use client";

import React, { useEffect, useState } from "react";
import {
  PresenceStatus,
  UserPresenceFormData,
  PRESENCE_STATUS_OPTIONS,
  SCHEDULED_ABSENCE_STATUSES,
} from "../../types/database";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import {
  MapPin,
  StickyNote,
  CalendarDays,
  Briefcase,
  ImageIcon,
  UserRound,
  Plus,
  X,
} from "lucide-react";
import { normalizeAbsenceDates } from "@/lib/calendar-absences";

export const EMPTY_PRESENCE_FORM: UserPresenceFormData = {
  status: "in_office",
  note: "",
  until_date: "",
  avatar_url: "",
  designation: "",
  absence_dates: [],
};

interface TeamPresenceModalProps {
  isOpen: boolean;
  isSaving: boolean;
  memberName: string;
  initialData: UserPresenceFormData | null;
  onClose: () => void;
  onSubmit: (data: UserPresenceFormData) => void;
}

function usesScheduledDates(status: PresenceStatus): boolean {
  return SCHEDULED_ABSENCE_STATUSES.includes(status);
}

export default function TeamPresenceModal({
  isOpen,
  isSaving,
  memberName,
  initialData,
  onClose,
  onSubmit,
}: TeamPresenceModalProps) {
  const [formState, setFormState] =
    useState<UserPresenceFormData>(EMPTY_PRESENCE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [pendingDate, setPendingDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_PRESENCE_FORM);
      setErrors({});
      setAvatarBroken(false);
      setPendingDate("");
    }
  }, [isOpen, initialData]);

  const handleInputChange = <K extends keyof UserPresenceFormData>(
    key: K,
    value: UserPresenceFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (key === "avatar_url") setAvatarBroken(false);
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addAbsenceDate = () => {
    const trimmed = pendingDate.trim();
    if (!trimmed) return;
    setFormState((prev) => ({
      ...prev,
      absence_dates: normalizeAbsenceDates([...prev.absence_dates, trimmed]),
    }));
    setPendingDate("");
  };

  const removeAbsenceDate = (date: string) => {
    setFormState((prev) => ({
      ...prev,
      absence_dates: prev.absence_dates.filter((d) => d !== date),
    }));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const url = formState.avatar_url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      errs.avatar_url = "Must start with http:// or https://";
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
    onSubmit({
      ...formState,
      absence_dates: usesScheduledDates(formState.status)
        ? normalizeAbsenceDates(formState.absence_dates)
        : [],
    });
  };

  const previewUrl = formState.avatar_url.trim();
  const showPreview = previewUrl.length > 0 && !avatarBroken;
  const showAbsenceDates = usesScheduledDates(formState.status);

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Profile"
      subtitle={memberName}
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSaving={isSaving}
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {renderSectionLabel(<UserRound className="w-3.5 h-3.5" />, "Profile")}

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[#2a7797]/10 text-[#2a7797]">
              {showPreview ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-quicksand leading-relaxed">
              Paste a public image URL for the profile photo. Preview updates as
              you type.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-avatar"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Profile picture URL
            </label>
            <div className="relative">
              <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="presence-avatar"
                type="url"
                value={formState.avatar_url}
                onChange={(e) =>
                  handleInputChange("avatar_url", e.target.value)
                }
                placeholder="https://…"
                aria-invalid={!!errors.avatar_url}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
              />
            </div>
            {errors.avatar_url ? (
              <p className="text-red-500 text-xs font-aileron" role="alert">
                {errors.avatar_url}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-designation"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Designation
            </label>
            <div className="relative">
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="presence-designation"
                type="text"
                value={formState.designation}
                onChange={(e) =>
                  handleInputChange("designation", e.target.value)
                }
                placeholder="e.g. Science Research Specialist II"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<MapPin className="w-3.5 h-3.5" />, "Presence")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-status"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Status
            </label>
            <select
              id="presence-status"
              value={formState.status}
              onChange={(e) =>
                handleInputChange("status", e.target.value as PresenceStatus)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
            >
              {PRESENCE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {showAbsenceDates ? (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <label
                htmlFor="presence-absence-date"
                className="text-[11px] font-semibold text-amber-900 font-quicksand"
              >
                Absence dates
              </label>
              <p className="text-[11px] text-amber-800/80 font-quicksand leading-relaxed">
                Add each day you will be{" "}
                {formState.status === "on_leave" ? "on leave" : "on travel"}.
                These appear on the lab calendar for the team.
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="presence-absence-date"
                    type="date"
                    value={pendingDate}
                    onChange={(e) => setPendingDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAbsenceDate();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={addAbsenceDate}
                  disabled={!pendingDate.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-40 transition-colors font-quicksand"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add date
                </button>
              </div>
              {formState.absence_dates.length > 0 ? (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {formState.absence_dates.map((date) => (
                    <li key={date}>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white pl-2.5 pr-1 py-1 text-[11px] font-bold text-amber-900 font-quicksand">
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                        <button
                          type="button"
                          onClick={() => removeAbsenceDate(date)}
                          aria-label={`Remove ${date}`}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-amber-800/70 font-aileron">
                  No dates selected yet.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="presence-until"
                className="text-[11px] font-semibold text-slate-500 font-quicksand"
              >
                Until (optional)
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="presence-until"
                  type="date"
                  value={formState.until_date}
                  onChange={(e) =>
                    handleInputChange("until_date", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-quicksand">
                Optional end date for this status.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {renderSectionLabel(<StickyNote className="w-3.5 h-3.5" />, "Note")}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="presence-note"
              className="text-[11px] font-semibold text-slate-500 font-quicksand"
            >
              Details (optional)
            </label>
            <textarea
              id="presence-note"
              rows={3}
              value={formState.note}
              onChange={(e) => handleInputChange("note", e.target.value)}
              placeholder="e.g. Conference in Manila, Wet lab bay 2…"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
            />
          </div>
        </div>
      </div>
    </SlideOverModal>
  );
}
