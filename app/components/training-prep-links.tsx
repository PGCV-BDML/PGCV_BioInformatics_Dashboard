"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import { describeDeleteError, describeSaveError } from "@/lib/db-errors";
import { deleteDataFromDB, saveDataToDB } from "@/lib/supabase";
import {
  getTrainingPrepLinks,
  nextPrepLinkSortOrder,
  normalizeTrainingPrepLinkUrl,
  validateTrainingPrepLinkTitle,
  validateTrainingPrepLinkUrl,
} from "@/lib/training-prep-links";
import type { TrainingPrepLink } from "@/types/database";

interface TrainingPrepLinksProps {
  programId: string;
}

const EMPTY_FORM = { title: "", url: "" };

export default function TrainingPrepLinks({ programId }: TrainingPrepLinksProps) {
  const { isStaff, isLearnerView, loading: portalLoading } = usePortal();
  const { showToast } = useToast();
  const canManage = isStaff && !isLearnerView;

  const [links, setLinks] = useState<TrainingPrepLink[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingPrepLink | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TrainingPrepLink | null>(
    null,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await getTrainingPrepLinks(programId);
      setLinks(rows);
    } catch (error) {
      console.error("Failed to load training prep links:", error);
      setLoadError(
        "Failed to load important links. Apply the latest Supabase migration, then refresh.",
      );
    } finally {
      setLoaded(true);
    }
  }, [programId]);

  useEffect(() => {
    if (portalLoading || isLearnerView) return;
    void load();
  }, [isLearnerView, load, portalLoading]);

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (link: TrainingPrepLink) => {
    setEditing(link);
    setForm({ title: link.title, url: link.url });
    setIsFormOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || isSaving) return;

    const titleError = validateTrainingPrepLinkTitle(form.title);
    if (titleError) {
      showToast(titleError, "error");
      return;
    }
    const urlError = validateTrainingPrepLinkUrl(form.url);
    if (urlError) {
      showToast(urlError, "error");
      return;
    }

    const title = form.title.trim();
    const url = normalizeTrainingPrepLinkUrl(form.url);
    const id = editing?.id ?? crypto.randomUUID();
    setIsSaving(true);
    try {
      const saved = (await saveDataToDB("training_prep_link", id, {
        program_id: programId,
        title,
        url,
        sort_order: editing?.sort_order ?? nextPrepLinkSortOrder(links),
      })) as TrainingPrepLink;
      setLinks((prev) => {
        const without = prev.filter((row) => row.id !== saved.id);
        return [...without, saved].sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.title.localeCompare(b.title);
        });
      });
      showToast(editing ? "Link updated." : "Link added.", "success");
      setIsFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      showToast(describeSaveError(error, "training_prep_link"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget || !canManage || isRemoving) return;
    setIsRemoving(true);
    try {
      await deleteDataFromDB("training_prep_link", removeTarget.id);
      setLinks((prev) => prev.filter((row) => row.id !== removeTarget.id));
      if (editing?.id === removeTarget.id) closeForm();
      showToast("Link removed.", "success");
      setRemoveTarget(null);
    } catch (error) {
      showToast(describeDeleteError(error, "training_prep_link"), "error");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleOpen = (link: TrainingPrepLink) => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  if (portalLoading || isLearnerView) return null;

  return (
    <>
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-2 border-b border-slate-100">
          <div className="flex items-start gap-2 min-w-0">
            <Link2 className="w-5 h-5 text-[#4ec2bb] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Important links
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Pin Drive folders, letter drafts, agendas, or any other URL this
                training needs.
              </p>
            </div>
          </div>
          {canManage && !isFormOpen && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#2a7797] text-white text-xs font-bold shadow-sm hover:bg-[#1f5f79] transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add link
            </button>
          )}
        </div>

        {loadError ? (
          <p className="text-xs font-semibold text-red-600" role="alert">
            {loadError}
          </p>
        ) : !loaded ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {canManage && isFormOpen && (
              <form
                className="rounded-[20px] border border-slate-200 bg-slate-50/40 p-4 space-y-3"
                onSubmit={(event) => void handleSave(event)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-600">
                      Title
                    </span>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      placeholder="e.g. Invitation letter"
                      autoFocus
                      className="mt-1 w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7797]/30 focus:border-[#2a7797]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-600">
                      Link
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={form.url}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          url: event.target.value,
                        }))
                      }
                      placeholder="https://drive.google.com/..."
                      className="mt-1 w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7797]/30 focus:border-[#2a7797]"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-9 px-3 rounded-xl bg-[#2a7797] text-white text-xs font-bold disabled:opacity-60"
                  >
                    {editing ? "Save" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    aria-label="Cancel link form"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {links.length === 0 && !isFormOpen ? (
              <p className="text-xs text-slate-400 italic py-2">
                No links yet
                {canManage
                  ? " — add a Drive folder, letter draft, or any other URL."
                  : "."}
              </p>
            ) : links.length > 0 ? (
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <Link2 className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {link.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                          {link.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(link)}
                              aria-label={`Edit ${link.title}`}
                              className="p-1.5 text-slate-300 hover:text-[#2a7797] rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(link)}
                              aria-label={`Remove ${link.title}`}
                              className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpen(link)}
                          aria-label={`Open ${link.title}`}
                          className="p-1.5 text-slate-300 hover:text-[#2a7797] rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={removeTarget !== null}
        title="Remove link"
        message={
          removeTarget
            ? `Remove “${removeTarget.title}” from this training’s prep links?`
            : ""
        }
        confirmLabel="Remove"
        isConfirming={isRemoving}
        onClose={() => {
          if (!isRemoving) setRemoveTarget(null);
        }}
        onConfirm={() => void handleRemove()}
      />
    </>
  );
}
