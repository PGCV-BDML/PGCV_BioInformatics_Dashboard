"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ListChecks,
  Mail,
  Plus,
  Projector,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import { describeDeleteError, describeSaveError } from "@/lib/db-errors";
import { routes } from "@/lib/routes";
import { deleteDataFromDB, saveDataToDB } from "@/lib/supabase";
import {
  TRAINING_PREP_CATEGORIES,
  getTrainingPrepItems,
  groupTrainingPrepItems,
  insertMissingDefaultTrainingPrepItems,
  missingDefaultTrainingPrepItems,
  nextPrepSortOrder,
  normalizeTrainingPrepNotes,
  trainingPrepProgress,
  validateTrainingPrepLabel,
} from "@/lib/training-prep-checklist";
import type { TrainingPrepCategory, TrainingPrepItem } from "@/types/database";

const CATEGORY_ICON: Record<
  TrainingPrepCategory,
  typeof Projector
> = {
  venue: Projector,
  documents: Mail,
  hospitality: UtensilsCrossed,
  day_of: Camera,
};

interface TrainingPrepChecklistProps {
  programId: string;
}

export default function TrainingPrepChecklist({
  programId,
}: TrainingPrepChecklistProps) {
  const router = useRouter();
  const { isStaff, isLearnerView, loading: portalLoading } = usePortal();
  const { showToast } = useToast();
  const canManage = isStaff && !isLearnerView;

  const [items, setItems] = useState<TrainingPrepItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState<TrainingPrepCategory | null>(
    null,
  );
  const [addLabel, setAddLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TrainingPrepItem | null>(
    null,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (portalLoading) return;
    if (isLearnerView) {
      router.replace(routes.training.detail(programId));
    }
  }, [isLearnerView, portalLoading, programId, router]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await getTrainingPrepItems(programId);
      setItems(rows);
      setNoteDrafts(
        Object.fromEntries(rows.map((row) => [row.id, row.notes ?? ""])),
      );
    } catch (error) {
      console.error("Failed to load training prep checklist:", error);
      setLoadError(
        "Failed to load the preparation checklist. Apply the latest Supabase migration, then refresh.",
      );
    } finally {
      setLoaded(true);
    }
  }, [programId]);

  useEffect(() => {
    if (portalLoading || isLearnerView) return;
    void load();
  }, [isLearnerView, load, portalLoading]);

  const grouped = useMemo(() => groupTrainingPrepItems(items), [items]);
  const progress = useMemo(() => trainingPrepProgress(items), [items]);
  const missingDefaults = useMemo(
    () => missingDefaultTrainingPrepItems(items.map((row) => row.item_key)),
    [items],
  );

  const markPending = (id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggle = async (item: TrainingPrepItem) => {
    if (!canManage || pendingIds.has(item.id)) return;
    const nextDone = !item.is_done;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, is_done: nextDone } : row,
      ),
    );
    markPending(item.id, true);
    try {
      await saveDataToDB("training_prep_item", item.id, { is_done: nextDone });
    } catch (error) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, is_done: item.is_done } : row,
        ),
      );
      showToast(describeSaveError(error, "training_prep_item"), "error");
    } finally {
      markPending(item.id, false);
    }
  };

  const handleNoteBlur = async (item: TrainingPrepItem) => {
    if (!canManage) return;
    const notes = normalizeTrainingPrepNotes(noteDrafts[item.id]);
    if (notes === (item.notes ?? null)) {
      setEditingNoteId(null);
      return;
    }
    markPending(item.id, true);
    try {
      await saveDataToDB("training_prep_item", item.id, { notes });
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, notes } : row)),
      );
      setNoteDrafts((prev) => ({ ...prev, [item.id]: notes ?? "" }));
    } catch (error) {
      setNoteDrafts((prev) => ({ ...prev, [item.id]: item.notes ?? "" }));
      showToast(describeSaveError(error, "training_prep_item"), "error");
    } finally {
      markPending(item.id, false);
      setEditingNoteId(null);
    }
  };

  const handleAdd = async (category: TrainingPrepCategory) => {
    if (!canManage || isAdding) return;
    const labelError = validateTrainingPrepLabel(addLabel);
    if (labelError) {
      showToast(labelError, "error");
      return;
    }

    const id = crypto.randomUUID();
    const label = addLabel.trim();
    setIsAdding(true);
    try {
      const saved = (await saveDataToDB("training_prep_item", id, {
        program_id: programId,
        item_key: null,
        category,
        label,
        is_done: false,
        notes: null,
        sort_order: nextPrepSortOrder(grouped[category]),
      })) as TrainingPrepItem;
      setItems((prev) => [...prev, saved]);
      setNoteDrafts((prev) => ({ ...prev, [saved.id]: "" }));
      setAddLabel("");
      setAddCategory(null);
      showToast("Checklist item added.", "success");
    } catch (error) {
      showToast(describeSaveError(error, "training_prep_item"), "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!canManage || isRestoring || missingDefaults.length === 0) return;
    setIsRestoring(true);
    try {
      const added = await insertMissingDefaultTrainingPrepItems(
        programId,
        items.map((row) => row.item_key),
      );
      await load();
      showToast(
        added === 1
          ? "Added 1 default checklist item."
          : `Added ${added} default checklist items.`,
        "success",
      );
    } catch (error) {
      showToast(describeSaveError(error, "training_prep_item"), "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget || !canManage || isRemoving) return;
    setIsRemoving(true);
    try {
      await deleteDataFromDB("training_prep_item", removeTarget.id);
      setItems((prev) => prev.filter((row) => row.id !== removeTarget.id));
      setNoteDrafts((prev) => {
        const next = { ...prev };
        delete next[removeTarget.id];
        return next;
      });
      showToast("Checklist item removed.", "success");
      setRemoveTarget(null);
    } catch (error) {
      showToast(describeDeleteError(error, "training_prep_item"), "error");
    } finally {
      setIsRemoving(false);
    }
  };

  if (portalLoading || isLearnerView) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-2 border-b border-slate-100">
          <div className="flex items-start gap-2 min-w-0">
            <ListChecks className="w-5 h-5 text-[#4ec2bb] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                Preparation checklist
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Tick off venue gear, letters, and day-of logistics before this
                training runs. Add notes or extra items as needed.
              </p>
            </div>
          </div>
          {canManage && missingDefaults.length > 0 && (
            <button
              type="button"
              onClick={() => void handleRestoreDefaults()}
              disabled={isRestoring}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#2a7797] text-white text-xs font-bold shadow-sm hover:bg-[#1f5f79] transition-colors shrink-0 disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {items.length === 0
                ? "Load default checklist"
                : "Add missing defaults"}
            </button>
          )}
        </div>

        {loaded && items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-500">
              <span>
                {progress.done} of {progress.total} ready
              </span>
              <span className="text-[#2a7797]">{progress.percent}%</span>
            </div>
            <div
              className="h-2 rounded-full bg-slate-100 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-label="Preparation progress"
            >
              <div
                className="h-full rounded-full bg-[#4ec2bb] transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {loadError ? (
          <p className="text-xs font-semibold text-red-600" role="alert">
            {loadError}
          </p>
        ) : !loaded ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No prep items yet
            {canManage
              ? " — load the default checklist (projector, letters, and the rest) or add your own items after loading."
              : "."}
          </p>
        ) : (
          <div className="space-y-5">
            {TRAINING_PREP_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICON[category.id];
              const categoryItems = grouped[category.id];
              const doneCount = categoryItems.filter((row) => row.is_done).length;

              return (
                <section
                  key={category.id}
                  className="rounded-[20px] border border-slate-200 bg-slate-50/40 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {category.label}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {category.hint}
                          {categoryItems.length > 0
                            ? ` · ${doneCount}/${categoryItems.length}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {categoryItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">
                      No items in this group yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {categoryItems.map((row) => {
                        const checkboxId = `prep-${row.id}`;
                        const isEditingNote = editingNoteId === row.id;
                        const noteValue = noteDrafts[row.id] ?? "";
                        const showNoteField =
                          isEditingNote || Boolean(row.notes);

                        return (
                          <li
                            key={row.id}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={row.is_done}
                                disabled={!canManage || pendingIds.has(row.id)}
                                onChange={() => void handleToggle(row)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
                              />
                              <div className="min-w-0 flex-1">
                                <label
                                  htmlFor={checkboxId}
                                  className={`block text-sm font-semibold cursor-pointer ${
                                    row.is_done
                                      ? "text-slate-400 line-through"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {row.label}
                                </label>
                                {showNoteField ? (
                                  canManage ? (
                                    <input
                                      type="text"
                                      value={noteValue}
                                      onChange={(event) =>
                                        setNoteDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: event.target.value,
                                        }))
                                      }
                                      onFocus={() => setEditingNoteId(row.id)}
                                      onBlur={() => void handleNoteBlur(row)}
                                      placeholder="Add a note, e.g. Room 203"
                                      className="mt-1.5 w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7797]/30 focus:border-[#2a7797]"
                                    />
                                  ) : (
                                    <p className="mt-1 text-[11px] text-slate-500">
                                      {row.notes}
                                    </p>
                                  )
                                ) : canManage ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditingNoteId(row.id)}
                                    className="mt-1 text-[11px] font-semibold text-slate-400 hover:text-[#2a7797]"
                                  >
                                    Add note
                                  </button>
                                ) : null}
                              </div>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => setRemoveTarget(row)}
                                  aria-label={`Remove ${row.label}`}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {canManage &&
                    (addCategory === category.id ? (
                      <form
                        className="flex flex-col sm:flex-row gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleAdd(category.id);
                        }}
                      >
                        <input
                          type="text"
                          value={addLabel}
                          onChange={(event) => setAddLabel(event.target.value)}
                          placeholder="e.g. Extra HDMI adapter"
                          autoFocus
                          className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2a7797]/30 focus:border-[#2a7797]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isAdding}
                            className="h-9 px-3 rounded-xl bg-[#2a7797] text-white text-xs font-bold disabled:opacity-60"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddCategory(null);
                              setAddLabel("");
                            }}
                            aria-label="Cancel adding item"
                            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddCategory(category.id);
                          setAddLabel("");
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:text-[#1f5f79]"
                      >
                        <Plus className="w-3 h-3" />
                        Add item
                      </button>
                    ))}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={removeTarget !== null}
        title="Remove checklist item"
        message={
          removeTarget
            ? `Remove “${removeTarget.label}” from this training’s prep list?`
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
