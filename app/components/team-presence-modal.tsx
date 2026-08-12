"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AbsenceBlock,
  PresenceStatus,
  UserPresenceAvatarChanges,
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
  UserRound,
  Plus,
  Trash2,
} from "lucide-react";
import {
  absenceBlockDayCount,
  validateAbsenceBlocks,
} from "@/lib/calendar-absences";
import { validateAvatarImage } from "@/lib/user-avatar";

export const EMPTY_PRESENCE_FORM: UserPresenceFormData = {
  status: "in_office",
  note: "",
  until_date: "",
  designation: "",
  absence_blocks: [],
  in_team_directory: true,
};

interface TeamPresenceModalProps {
  isOpen: boolean;
  isSaving: boolean;
  memberName: string;
  initialData: UserPresenceFormData | null;
  initialAvatarPreviewUrl: string | null;
  canManageDirectory: boolean;
  onClose: () => void;
  onSubmit: (
    data: UserPresenceFormData,
    avatarChanges?: UserPresenceAvatarChanges,
  ) => void;
}

function usesScheduledDates(status: PresenceStatus): boolean {
  return SCHEDULED_ABSENCE_STATUSES.includes(status);
}

export default function TeamPresenceModal({
  isOpen,
  isSaving,
  memberName,
  initialData,
  initialAvatarPreviewUrl,
  canManageDirectory,
  onClose,
  onSubmit,
}: TeamPresenceModalProps) {
  const [formState, setFormState] =
    useState<UserPresenceFormData>(EMPTY_PRESENCE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(
    null,
  );
  const [removeAvatarRequested, setRemoveAvatarRequested] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const nextBlockId = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setFormState(initialData || EMPTY_PRESENCE_FORM);
      setErrors({});
      setPendingAvatarFile(null);
      setLocalAvatarPreview(null);
      setRemoveAvatarRequested(false);
      setAvatarBroken(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!pendingAvatarFile) {
      setLocalAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingAvatarFile);
    setLocalAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingAvatarFile]);

  const handleInputChange = <K extends keyof UserPresenceFormData>(
    key: K,
    value: UserPresenceFormData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearAbsenceError = () =>
    setErrors((prev) => {
      if (!prev.absence_blocks) return prev;
      const next = { ...prev };
      delete next.absence_blocks;
      return next;
    });

  const addAbsenceBlock = () => {
    nextBlockId.current += 1;
    const block: AbsenceBlock = {
      id: `new-absence-${nextBlockId.current}`,
      start_date: "",
      end_date: "",
      note: "",
    };
    setFormState((prev) => ({
      ...prev,
      absence_blocks: [...prev.absence_blocks, block],
    }));
    clearAbsenceError();
  };

  const updateAbsenceBlock = (
    id: string,
    patch: Partial<Omit<AbsenceBlock, "id">>,
  ) => {
    setFormState((prev) => ({
      ...prev,
      absence_blocks: prev.absence_blocks.map((block) => {
        if (block.id !== id) return block;
        const next = { ...block, ...patch };
        // Keep the range coherent while the user is still picking dates.
        if (patch.start_date && next.end_date && next.end_date < patch.start_date) {
          next.end_date = patch.start_date;
        }
        return next;
      }),
    }));
    clearAbsenceError();
  };

  const removeAbsenceBlock = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      absence_blocks: prev.absence_blocks.filter((block) => block.id !== id),
    }));
    clearAbsenceError();
  };

  async function handleAvatarPicked(file: File | null) {
    setErrors((prev) => {
      if (!prev.avatar) return prev;
      const next = { ...prev };
      delete next.avatar;
      return next;
    });

    if (!file) {
      setPendingAvatarFile(null);
      return;
    }

    const validationError = validateAvatarImage(file);
    if (validationError) {
      setErrors((prev) => ({ ...prev, avatar: validationError }));
      setPendingAvatarFile(null);
      return;
    }

    setPendingAvatarFile(file);
    setRemoveAvatarRequested(false);
    setAvatarBroken(false);
  }

  function handleRemoveAvatar() {
    setPendingAvatarFile(null);
    setRemoveAvatarRequested(true);
    setAvatarBroken(false);
    setErrors((prev) => {
      if (!prev.avatar) return prev;
      const next = { ...prev };
      delete next.avatar;
      return next;
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isScheduled = usesScheduledDates(formState.status);
    if (isScheduled) {
      const absenceError = validateAbsenceBlocks(formState.absence_blocks);
      if (absenceError) {
        setErrors((prev) => ({ ...prev, absence_blocks: absenceError }));
        return;
      }
    }

    onSubmit(
      {
        ...formState,
        absence_blocks: isScheduled ? formState.absence_blocks : [],
      },
      {
        file: pendingAvatarFile ?? undefined,
        remove: removeAvatarRequested || undefined,
      },
    );
  };

  const hasExistingAvatar = Boolean(initialAvatarPreviewUrl);
  const showStoredPreview =
    !removeAvatarRequested && (localAvatarPreview || initialAvatarPreviewUrl);
  const displayPreview = localAvatarPreview || initialAvatarPreviewUrl;
  const showAbsenceDates = usesScheduledDates(formState.status);
  const scheduledLabel = formState.status === "on_travel" ? "Trip" : "Leave";

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
              {showStoredPreview && displayPreview && !avatarBroken ? (
                <img
                  src={displayPreview}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-quicksand leading-relaxed">
              Upload a profile photo for the team directory. JPEG, PNG, or WebP
              under 1 MB.
            </p>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void handleAvatarPicked(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => avatarInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#2a7797]/30 hover:text-[#2a7797] disabled:opacity-60 transition-colors font-quicksand"
            >
              {hasExistingAvatar || pendingAvatarFile
                ? "Replace photo"
                : "Upload photo"}
            </button>
            {(hasExistingAvatar || pendingAvatarFile) &&
            !removeAvatarRequested ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleRemoveAvatar}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60 transition-colors font-quicksand"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
          </div>

          {errors.avatar ? (
            <p className="text-red-500 text-xs font-aileron" role="alert">
              {errors.avatar}
            </p>
          ) : null}

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

          {canManageDirectory ? (
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.in_team_directory}
                onChange={(e) =>
                  handleInputChange("in_team_directory", e.target.checked)
                }
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
              />
              <span className="text-[11px] text-slate-600 font-quicksand leading-relaxed">
                <span className="font-semibold text-slate-700">
                  Bioinformatics team member
                </span>
                <br />
                Include on the Team page and calendar absences. Turn off for staff
                who use the dashboard but are not part of the BDML roster.
              </span>
            </label>
          ) : null}
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
              <span className="text-[11px] font-semibold text-amber-900 font-quicksand">
                Scheduled {scheduledLabel.toLowerCase()}
              </span>
              <p className="text-[11px] text-amber-800/80 font-quicksand leading-relaxed">
                Each entry below is a separate {scheduledLabel.toLowerCase()}{" "}
                with its own note, shown on the lab calendar for those days
                only.
              </p>

              {formState.absence_blocks.length > 0 ? (
                <ul className="flex flex-col gap-2 pt-1">
                  {formState.absence_blocks.map((block, index) => {
                    const dayCount = absenceBlockDayCount(block);
                    return (
                      <li
                        key={block.id}
                        className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-amber-900 font-quicksand">
                            {scheduledLabel} {index + 1}
                            {dayCount > 0
                              ? ` · ${dayCount} ${dayCount === 1 ? "day" : "days"}`
                              : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAbsenceBlock(block.id)}
                            aria-label={`Remove ${scheduledLabel.toLowerCase()} ${index + 1}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`${block.id}-start`}
                              className="text-[10px] font-semibold text-slate-500 font-quicksand"
                            >
                              From
                            </label>
                            <input
                              id={`${block.id}-start`}
                              type="date"
                              value={block.start_date}
                              onChange={(e) =>
                                updateAbsenceBlock(block.id, {
                                  start_date: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`${block.id}-end`}
                              className="text-[10px] font-semibold text-slate-500 font-quicksand"
                            >
                              To
                            </label>
                            <input
                              id={`${block.id}-end`}
                              type="date"
                              value={block.end_date}
                              min={block.start_date || undefined}
                              onChange={(e) =>
                                updateAbsenceBlock(block.id, {
                                  end_date: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
                            />
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={block.note}
                          onChange={(e) =>
                            updateAbsenceBlock(block.id, {
                              note: e.target.value,
                            })
                          }
                          aria-label={`Note for ${scheduledLabel.toLowerCase()} ${index + 1}`}
                          placeholder="Note for these dates, e.g. Family vacation…"
                          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-[#2a7797]/50 focus:ring-2 focus:ring-[#2a7797]/15"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[11px] text-amber-800/70 font-aileron">
                  No dates selected yet.
                </p>
              )}

              <button
                type="button"
                onClick={addAbsenceBlock}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors font-quicksand"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another {scheduledLabel.toLowerCase()}
              </button>

              {errors.absence_blocks ? (
                <p className="text-[11px] font-semibold text-rose-600 font-quicksand">
                  {errors.absence_blocks}
                </p>
              ) : null}
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

          {showAbsenceDates ? (
            <p className="text-[11px] text-slate-400 font-quicksand leading-relaxed">
              Notes are set per {scheduledLabel.toLowerCase()} above, so each
              one keeps its own details on the calendar.
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </SlideOverModal>
  );
}
