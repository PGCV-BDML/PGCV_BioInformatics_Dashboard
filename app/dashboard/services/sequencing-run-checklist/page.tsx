"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  ClipboardCheck,
} from "lucide-react";
import { PageHeader } from "../../../components/pageheader";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/state-views";
import DeleteModal from "../../../components/deletemodal";
import SequencingRunModal, {
  EMPTY_SEQUENCING_RUN_FORM,
} from "../../../components/sequencing-run-modal";
import SequencingRunItemModal from "../../../components/sequencing-run-item-modal";
import { TruncatedText } from "../../../components/cell-tooltip";
import type {
  Repository,
  SequencingRun,
  SequencingRunChecklistItem,
  SequencingRunChecklistItemFormData,
  SequencingRunFormData,
  SequencingRunWithRepository,
  UserOption,
} from "../../../../types/database";
import {
  deleteDataFromDB,
  getChecklistAnalystsByItemId,
  getRowsFromDB,
  getTeamDirectoryUsers,
  replaceChecklistAnalysts,
  saveDataToDB,
} from "@/lib/supabase";
import { sequencingRunChecklistBreadcrumbs } from "@/lib/breadcrumbs";
import { useDashboardUI } from "../../../components/dashboard-ui-context";
import { useToast } from "../../../components/toast";
import { formatDate } from "@/lib/utils";
import { describeDeleteError, describeSaveError } from "@/lib/db-errors";
import {
  buildRunsWithRepository,
  checklistItemFormToPayload,
  formatAnalystNames,
  nextChecklistSortOrder,
  runFormToPayload,
  sortRunsNewestFirst,
  toChecklistItemFormData,
} from "@/lib/sequencing-run-checklist";

type DeleteTarget =
  | { kind: "run"; run: SequencingRunWithRepository }
  | { kind: "item"; run: SequencingRunWithRepository; item: SequencingRunChecklistItem };

export default function SequencingRunChecklistPage() {
  const [runs, setRuns] = useState<SequencingRun[]>([]);
  const [items, setItems] = useState<SequencingRunChecklistItem[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [analystsByItemId, setAnalystsByItemId] = useState<
    Map<string, string[]>
  >(new Map());
  const [staffUsers, setStaffUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddingRun, setIsAddingRun] = useState(false);
  const [isEditingRun, setIsEditingRun] = useState(false);
  const [selectedRun, setSelectedRun] = useState<SequencingRunWithRepository | null>(
    null,
  );

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [itemRun, setItemRun] = useState<SequencingRunWithRepository | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<SequencingRunChecklistItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const isRunPanelOpen = isAddingRun || isEditingRun;
  const isItemPanelOpen = isAddingItem || isEditingItem;
  const isPanelOpen = isRunPanelOpen || isItemPanelOpen;
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();

  const reload = useCallback(async () => {
    const [
      runRows,
      itemRows,
      repoRows,
      analystMap,
      users,
    ] = await Promise.all([
      getRowsFromDB<SequencingRun>("sequencing_run"),
      getRowsFromDB<SequencingRunChecklistItem>("sequencing_run_checklist_item"),
      getRowsFromDB<Repository>("repository"),
      getChecklistAnalystsByItemId(),
      getTeamDirectoryUsers<UserOption>(),
    ]);
    setRuns(runRows);
    setItems(itemRows);
    setRepositories(repoRows);
    setAnalystsByItemId(analystMap);
    setStaffUsers(users);
  }, []);

  useEffect(() => {
    toggleSidebar(isPanelOpen);
  }, [isPanelOpen, toggleSidebar]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        await reload();
      } catch (err) {
        console.error("Failed to load Sequencing Run Checklist:", err);
        if (!cancelled) {
          setLoadError(
            "Couldn't load Sequencing Run Checklist. Apply the latest Supabase migration, then refresh.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const usersById = useMemo(
    () => new Map(staffUsers.map((user) => [user.id, user])),
    [staffUsers],
  );

  const usedRepositoryIds = useMemo(
    () => new Set(runs.map((run) => run.repository_id)),
    [runs],
  );

  const enrichedRuns = useMemo(() => {
    return sortRunsNewestFirst(
      buildRunsWithRepository(runs, repositories, items, analystsByItemId),
    );
  }, [runs, repositories, items, analystsByItemId]);

  const filteredRuns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return enrichedRuns;

    return enrichedRuns.filter((run) => {
      const haystack = [
        run.run_id,
        run.repository_title,
        run.notes,
        ...run.items.flatMap((item) => [
          item.client_name,
          item.analysis_type,
          formatAnalystNames(item.analyst_ids ?? [], usersById),
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [enrichedRuns, searchQuery, usersById]);

  const handleSaveRun = async (form: SequencingRunFormData) => {
    setIsSaving(true);
    try {
      const payload = runFormToPayload(form);
      if (isAddingRun) {
        const newId = crypto.randomUUID();
        await saveDataToDB("sequencing_run", newId, payload);
        showToast("Sequencing run checklist created.", "success");
      } else if (selectedRun) {
        await saveDataToDB("sequencing_run", selectedRun.id, {
          date_received: payload.date_received,
          notes: payload.notes,
        });
        showToast("Sequencing run updated.", "success");
      }
      await reload();
      setIsAddingRun(false);
      setIsEditingRun(false);
      setSelectedRun(null);
    } catch (err) {
      console.error("Failed to save sequencing run:", err);
      showToast(describeSaveError(err, "sequencing_run"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async (form: SequencingRunChecklistItemFormData) => {
    if (!itemRun) return;
    setIsSaving(true);
    try {
      if (isAddingItem) {
        const newId = crypto.randomUUID();
        const payload = checklistItemFormToPayload(
          form,
          itemRun.id,
          nextChecklistSortOrder(itemRun.items),
        );
        await saveDataToDB("sequencing_run_checklist_item", newId, payload);
        await replaceChecklistAnalysts(newId, form.analyst_ids);
        showToast("Checklist row added.", "success");
      } else if (selectedItem) {
        const payload = checklistItemFormToPayload(
          form,
          itemRun.id,
          selectedItem.sort_order,
        );
        await saveDataToDB("sequencing_run_checklist_item", selectedItem.id, payload);
        await replaceChecklistAnalysts(selectedItem.id, form.analyst_ids);
        showToast("Checklist row updated.", "success");
      }
      await reload();
      setIsAddingItem(false);
      setIsEditingItem(false);
      setItemRun(null);
      setSelectedItem(null);
    } catch (err) {
      console.error("Failed to save checklist row:", err);
      showToast(
        describeSaveError(err, "sequencing_run_checklist_item"),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async (
    run: SequencingRunWithRepository,
    item: SequencingRunChecklistItem,
  ) => {
    setTogglingItemId(item.id);
    try {
      await saveDataToDB("sequencing_run_checklist_item", item.id, {
        is_complete: !item.is_complete,
      });
      await reload();
    } catch (err) {
      console.error("Failed to toggle checklist row:", err);
      showToast(
        describeSaveError(err, "sequencing_run_checklist_item"),
        "error",
      );
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.kind === "run") {
        await deleteDataFromDB("sequencing_run", deleteTarget.run.id);
        showToast("Sequencing run checklist deleted.", "success");
      } else {
        await deleteDataFromDB(
          "sequencing_run_checklist_item",
          deleteTarget.item.id,
        );
        showToast("Checklist row deleted.", "success");
      }
      await reload();
      setDeleteTarget(null);
    } catch (err) {
      const table =
        deleteTarget.kind === "run"
          ? "sequencing_run"
          : "sequencing_run_checklist_item";
      showToast(describeDeleteError(err, table), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const lockedRepository =
    selectedRun != null
      ? repositories.find((repo) => repo.id === selectedRun.repository_id) ?? null
      : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        breadcrumbTrail={sequencingRunChecklistBreadcrumbs}
        title="Sequencing Run Checklist"
        subtitle="Analyst reference board for incoming sequencing runs — tied to Repository run IDs."
        actions={
          <button
            type="button"
            onClick={() => {
              setSelectedRun(null);
              setIsEditingRun(false);
              setIsAddingRun(true);
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#2a7797] text-white text-xs font-bold shadow-sm hover:bg-[#236682] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New run
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run ID, client, analyst…"
            className="w-full h-10 pl-10 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none"
          />
        </div>
        <p className="text-[11px] text-slate-500 font-aileron">
          Reference only — rows do not create service reports automatically.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading sequencing run checklists…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : enrichedRuns.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No sequencing run checklists yet"
          description="Create a checklist when sequences arrive. Each run must link to a Repository entry that already has a run ID."
          action={
            <button
              type="button"
              onClick={() => setIsAddingRun(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#2a7797] text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              New run
            </button>
          }
        />
      ) : filteredRuns.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No matching runs"
          description="Try a different search term."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {filteredRuns.map((run) => (
            <section
              key={run.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-base font-bold text-slate-900">
                      {run.run_id ?? "—"}
                    </h2>
                    {run.repository_url && (
                      <a
                        href={run.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:underline"
                      >
                        Repository
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 truncate">
                    {run.repository_title}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Received {formatDate(run.date_received)}
                  </p>
                  {run.notes?.trim() && (
                    <p className="mt-2 text-[11px] text-slate-600">{run.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setItemRun(run);
                      setSelectedItem(null);
                      setIsEditingItem(false);
                      setIsAddingItem(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add row
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRun(run);
                      setIsAddingRun(false);
                      setIsEditingRun(true);
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Edit run"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ kind: "run", run })}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50"
                    aria-label="Delete run"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {run.items.length === 0 ? (
                <div className="px-4 py-8 text-center text-[11px] text-slate-500">
                  No checklist rows yet. Add client jobs for this run.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                        <th className="w-10 px-3 py-2.5" aria-label="Complete" />
                        <th className="px-3 py-2.5 font-bold">Client</th>
                        <th className="px-3 py-2.5 font-bold">Analysis</th>
                        <th className="px-3 py-2.5 font-bold w-24">Samples</th>
                        <th className="px-3 py-2.5 font-bold min-w-[8rem]">Analysts</th>
                        <th className="w-20 px-3 py-2.5" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {run.items.map((item) => {
                        const analystLabel = formatAnalystNames(
                          item.analyst_ids ?? [],
                          usersById,
                        );
                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-50 last:border-0 ${
                              item.is_complete ? "bg-slate-50/60" : "bg-white"
                            }`}
                          >
                            <td className="px-3 py-2.5 align-middle">
                              <input
                                type="checkbox"
                                checked={item.is_complete}
                                disabled={togglingItemId === item.id}
                                onChange={() => handleToggleComplete(run, item)}
                                aria-label={`Mark ${item.client_name} complete`}
                                className="h-4 w-4 rounded border-slate-300 text-[#2a7797] focus:ring-[#4ec2bb]/30"
                              />
                            </td>
                            <td className="px-3 py-2.5 align-middle text-xs font-bold text-slate-800">
                              <span className={item.is_complete ? "line-through text-slate-500" : ""}>
                                {item.client_name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-middle text-xs text-slate-700">
                              {item.analysis_type}
                            </td>
                            <td className="px-3 py-2.5 align-middle text-xs font-bold text-slate-800 tabular-nums">
                              {item.sample_count}
                            </td>
                            <td className="px-3 py-2.5 align-middle text-xs text-slate-700 max-w-[10rem]">
                              <TruncatedText text={analystLabel} className="block truncate" />
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemRun(run);
                                    setSelectedItem(item);
                                    setIsAddingItem(false);
                                    setIsEditingItem(true);
                                  }}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100"
                                  aria-label="Edit row"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({ kind: "item", run, item })
                                  }
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                                  aria-label="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <SequencingRunModal
        isOpen={isRunPanelOpen}
        isAdding={isAddingRun}
        isSaving={isSaving}
        initialData={
          isEditingRun && selectedRun
            ? {
                repository_id: selectedRun.repository_id,
                date_received: selectedRun.date_received,
                notes: selectedRun.notes ?? "",
              }
            : EMPTY_SEQUENCING_RUN_FORM
        }
        repositories={repositories}
        usedRepositoryIds={usedRepositoryIds}
        lockedRepository={lockedRepository}
        onClose={() => {
          setIsAddingRun(false);
          setIsEditingRun(false);
          setSelectedRun(null);
        }}
        onSubmit={handleSaveRun}
      />

      <SequencingRunItemModal
        isOpen={isItemPanelOpen}
        isAdding={isAddingItem}
        isSaving={isSaving}
        initialData={
          isEditingItem && selectedItem
            ? toChecklistItemFormData(selectedItem)
            : null
        }
        staffUsers={staffUsers}
        onClose={() => {
          setIsAddingItem(false);
          setIsEditingItem(false);
          setItemRun(null);
          setSelectedItem(null);
        }}
        onSubmit={handleSaveItem}
      />

      <DeleteModal
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        itemName={
          deleteTarget?.kind === "run"
            ? `checklist for ${deleteTarget.run.run_id ?? "this run"}`
            : `${deleteTarget?.item.client_name ?? "this row"}`
        }
      />
    </div>
  );
}
