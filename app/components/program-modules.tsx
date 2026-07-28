"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import SlideOverModal from "@/app/components/slidemodal";
import ConfirmModal from "@/app/components/confirm-modal";
import { usePortal } from "@/app/components/portal-context";
import { useToast } from "@/app/components/toast";
import type { ProgramType } from "@/lib/routes";
import {
  expandPackItemIds,
  libraryForProgramType,
  packsForProgramType,
  type ModuleLibraryItem,
} from "@/lib/module-library";
import {
  deleteDataFromDB,
  getRowsFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import type { Module } from "@/types/database";

interface ProgramModulesProps {
  programId: string;
  programType: ProgramType;
}

type ModuleRow = {
  id: string;
  title: string;
  htmlLink: string | null;
  order: number;
};

export default function ProgramModules({
  programId,
  programType,
}: ProgramModulesProps) {
  const { isStaff, isLearnerView } = usePortal();
  const { showToast } = useToast();
  const canBuild = isStaff && !isLearnerView;
  const isTraining = programType === "training";
  const storageKey = `${programType}-modules-read-${programId}`;

  const [modulesList, setModulesList] = useState<ModuleRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ModuleRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [busyModuleId, setBusyModuleId] = useState<string | null>(null);

  const [readModuleIds, setReadModuleIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed)
        ? parsed.filter((x) => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(readModuleIds));
    } catch {
      // ignore
    }
  }, [readModuleIds, storageKey]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const modules = await getRowsFromDB<Module>("module");
      const filtered = modules
        .filter((m) => m.program_id === programId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((m, index) => ({
          id: m.id,
          title: m.title?.trim() || `Module ${index + 1}`,
          htmlLink: m.html_content_link,
          order: m.order ?? index + 1,
        }));
      setModulesList(filtered);
    } catch (error) {
      console.error("Failed to load modules:", error);
      setLoadError("Failed to load modules. Please refresh the page.");
    }
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  const assignedPaths = useMemo(
    () => new Set(modulesList.map((m) => m.htmlLink).filter(Boolean)),
    [modulesList],
  );

  const availableLibrary = useMemo(
    () =>
      libraryForProgramType(programType).filter(
        (item) => !assignedPaths.has(item.htmlPath),
      ),
    [assignedPaths, programType],
  );

  const availablePacks = useMemo(
    () =>
      packsForProgramType(programType).filter((pack) =>
        expandPackItemIds(pack.id).some(
          (item) => !assignedPaths.has(item.htmlPath),
        ),
      ),
    [assignedPaths, programType],
  );

  const libraryByGroup = useMemo(() => {
    const groups = new Map<string, ModuleLibraryItem[]>();
    for (const item of availableLibrary) {
      const key = item.group ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [availableLibrary]);

  const toggleMarkAsRead = (moduleId: string) => {
    setReadModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const openMaterials = (module: ModuleRow) => {
    if (!module.htmlLink) {
      showToast("No materials linked for this module.", "error");
      return;
    }
    window.open(module.htmlLink, "_blank", "noopener,noreferrer");
  };

  const persistOrder = async (ordered: ModuleRow[]) => {
    await Promise.all(
      ordered.map((row, index) =>
        saveDataToDB("module", row.id, { order: index + 1 }),
      ),
    );
    setModulesList(
      ordered.map((row, index) => ({ ...row, order: index + 1 })),
    );
  };

  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    const index = modulesList.findIndex((m) => m.id === moduleId);
    if (index < 0) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= modulesList.length) return;

    const next = [...modulesList];
    const current = next[index];
    const other = next[swapWith];
    if (!current || !other) return;
    next[index] = other;
    next[swapWith] = current;

    setBusyModuleId(moduleId);
    try {
      await persistOrder(next);
    } catch (error) {
      console.error("Failed to reorder modules:", error);
      showToast("Failed to reorder modules.", "error");
      await load();
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await deleteDataFromDB("module", removeTarget.id);
      const remaining = modulesList.filter((m) => m.id !== removeTarget.id);
      await persistOrder(remaining);
      setReadModuleIds((prev) => prev.filter((id) => id !== removeTarget.id));
      setRemoveTarget(null);
      showToast("Module removed from course.", "success");
    } catch (error) {
      console.error("Failed to remove module:", error);
      showToast("Failed to remove module.", "error");
    } finally {
      setIsRemoving(false);
    }
  };

  const resolveItemsToAdd = (): ModuleLibraryItem[] => {
    const byPath = new Map<string, ModuleLibraryItem>();

    for (const id of selectedLibraryIds) {
      const item = availableLibrary.find((entry) => entry.id === id);
      if (item && !assignedPaths.has(item.htmlPath)) {
        byPath.set(item.htmlPath, item);
      }
    }

    for (const packId of selectedPackIds) {
      for (const item of expandPackItemIds(packId)) {
        if (!assignedPaths.has(item.htmlPath) && !byPath.has(item.htmlPath)) {
          byPath.set(item.htmlPath, item);
        }
      }
    }

    return Array.from(byPath.values());
  };

  const handleAddSelected = async () => {
    const toAdd = resolveItemsToAdd();
    if (toAdd.length === 0) return;

    setIsSaving(true);
    try {
      let nextOrder =
        modulesList.reduce((max, row) => Math.max(max, row.order), 0) + 1;
      const created: ModuleRow[] = [];

      for (const item of toAdd) {
        const id = crypto.randomUUID();
        const saved = (await saveDataToDB("module", id, {
          id,
          program_id: programId,
          title: item.title,
          html_content_link: item.htmlPath,
          order: nextOrder,
          save_log_enabled: true,
        })) as Module;

        created.push({
          id: saved.id,
          title: saved.title?.trim() || item.title,
          htmlLink: saved.html_content_link,
          order: saved.order ?? nextOrder,
        });
        nextOrder += 1;
      }

      setModulesList((prev) => [...prev, ...created]);
      setSelectedLibraryIds([]);
      setSelectedPackIds([]);
      setIsPickerOpen(false);
      showToast(
        toAdd.length === 1
          ? "Module added to course."
          : `${toAdd.length} modules added to course.`,
        "success",
      );
    } catch (error) {
      console.error("Failed to add modules:", error);
      showToast("Failed to add modules.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLibraryId = (id: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const togglePackId = (id: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedCount = resolveItemsToAdd().length;

  return (
    <>
      <div className="bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
              {isTraining ? "Training" : "Internship"} Modules Progression
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              {readModuleIds.length} of {modulesList.length} modules completed
              {canBuild
                ? " • Add modules from the prepared library"
                : " • Progress saved on this device"}
            </p>
          </div>
          {canBuild && (
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#2a7797] hover:bg-[#1f5f79] text-white text-xs font-bold rounded-full shadow-sm transition-colors self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Add from library
            </button>
          )}
        </div>

        {loadError ? (
          <p className="text-sm text-rose-600 font-semibold">{loadError}</p>
        ) : modulesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-4">
            <BookOpen className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              {canBuild ? "No modules in this course yet" : "No modules assigned"}
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              {canBuild
                ? "Use Add from library to build this course syllabus from prepared HTML modules."
                : "Your instructor has not added modules to this course yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {modulesList.map((module, index) => {
              const isRead = readModuleIds.includes(module.id);
              const step = `M${index + 1}`;

              return (
                <div
                  key={module.id}
                  className={`w-full rounded-[20px] p-4 border transition-all duration-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm ${
                    isRead
                      ? "border-[#4ec2bb]/60 bg-[#f0faf9]"
                      : "border-slate-200 bg-[#FAF9F5]"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold transition-colors ${
                        isRead
                          ? "bg-[#4ec2bb] text-white"
                          : "bg-white border border-slate-200 text-slate-400"
                      }`}
                    >
                      {step}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-snug truncate">
                        {module.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {isRead && (
                      <CheckCircle2 className="w-[18px] h-[18px] text-[#4ec2bb]" />
                    )}

                    {canBuild && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Move module up"
                          disabled={index === 0 || busyModuleId === module.id}
                          onClick={() => moveModule(module.id, "up")}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move module down"
                          disabled={
                            index === modulesList.length - 1 ||
                            busyModuleId === module.id
                          }
                          onClick={() => moveModule(module.id, "down")}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${module.title}`}
                          onClick={() => setRemoveTarget(module)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleMarkAsRead(module.id)}
                      className={`flex items-center gap-1.5 text-[11px] font-extrabold px-4 py-2 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                        isRead
                          ? "bg-white hover:bg-amber-50 border-[#4ec2bb]/40 text-[#247974] hover:text-amber-600 hover:border-amber-300"
                          : "bg-white hover:bg-[#4ec2bb] border-slate-200 hover:border-[#4ec2bb] text-slate-700 hover:text-white"
                      }`}
                    >
                      {isRead ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </>
                      ) : (
                        "Mark as Read"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openMaterials(module)}
                      className="text-[11px] font-extrabold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-[#4ec2bb] hover:border-[#4ec2bb] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                      View Materials
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SlideOverModal
        isOpen={isPickerOpen}
        onClose={() => {
          if (isSaving) return;
          setIsPickerOpen(false);
          setSelectedLibraryIds([]);
          setSelectedPackIds([]);
        }}
        title="Add modules from library"
        subtitle="Select prepared materials to include in this course"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsPickerOpen(false);
                setSelectedLibraryIds([]);
                setSelectedPackIds([]);
              }}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || selectedCount === 0}
              onClick={handleAddSelected}
              className="h-10 px-4 bg-[#2a7797] hover:bg-[#1f5f79] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
            >
              {isSaving
                ? "Adding…"
                : selectedCount > 0
                  ? `Add ${selectedCount}`
                  : "Add selected"}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {availablePacks.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] font-quicksand">
                Packs
              </p>
              {availablePacks.map((pack) => {
                const checked = selectedPackIds.includes(pack.id);
                return (
                  <label
                    key={pack.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                      checked
                        ? "border-[#4ec2bb] bg-[#f0faf9]"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePackId(pack.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-800">
                        {pack.title}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {pack.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </section>
          )}

          {libraryByGroup.length === 0 && availablePacks.length === 0 ? (
            <p className="text-sm text-slate-500">
              Every library module is already on this course.
            </p>
          ) : (
            libraryByGroup.map(([group, items]) => (
              <section key={group} className="space-y-2">
                <p className="text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] font-quicksand">
                  {group}
                </p>
                {items.map((item) => {
                  const checked = selectedLibraryIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                        checked
                          ? "border-[#4ec2bb] bg-[#f0faf9]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLibraryId(item.id)}
                        className="mt-1"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        {item.title}
                      </span>
                    </label>
                  );
                })}
              </section>
            ))
          )}
        </div>
      </SlideOverModal>

      <ConfirmModal
        isOpen={!!removeTarget}
        title="Remove module"
        message={
          <>
            Remove <strong>{removeTarget?.title}</strong> from this course?
            The library asset stays available for other programs.
          </>
        }
        confirmLabel="Remove"
        isConfirming={isRemoving}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
