"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Link2,
  ExternalLink,
  Plus,
  Inbox,
  Edit3,
  Trash2,
  FolderGit2,
  Dna,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import DeleteModal from "../../components/deletemodal";
import RepositoryModal, {
  EMPTY_REPOSITORY_FORM,
} from "../../components/repositorymodal";
import { CategoryChips } from "../../components/category-chips";
import {
  Repository,
  RepositoryFormData,
  RepositoryCategory,
  REPOSITORY_KIND_OPTIONS,
} from "../../../types/database";
import {
  getRowsFromDB,
  saveDataToDB,
  getRepositoryCategoriesByRepoId,
  replaceRepositoryCategories,
} from "@/lib/supabase";
import {
  REPOSITORY_CATEGORY_OPTIONS,
  REPOSITORY_CATEGORY_LABELS,
  REPOSITORY_CATEGORY_STYLES,
  resolveRepositoryCategories,
} from "@/lib/repository-categories";
import { repositoriesBreadcrumbs } from "@/lib/breadcrumbs";
import { routes } from "@/lib/routes";
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";

const FILTER_OPTIONS: { value: RepositoryCategory | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...REPOSITORY_CATEGORY_OPTIONS,
];

function kindLabel(kind: Repository["kind"]): string {
  return REPOSITORY_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

function withResolvedCategories(
  row: Repository,
  categoriesByRepo: Map<string, RepositoryCategory[]>,
): Repository {
  return {
    ...row,
    categories: categoriesByRepo.get(row.id) ?? (row.category ? [row.category] : []),
  };
}

function buildRepositoryPayload(formData: RepositoryFormData) {
  const categories = Array.from(new Set(formData.categories));
  return {
    kind: formData.kind,
    title: formData.title.trim(),
    url: formData.url.trim(),
    description: formData.description.trim() || null,
    category: categories[0] ?? ("other" as const),
    run_id: formData.run_id.trim() || null,
  };
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<RepositoryCategory | "All">(
    "All",
  );

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPanelOpen = isAdding || isEditing;
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();

  useEffect(() => {
    toggleSidebar(isPanelOpen);
  }, [isPanelOpen, toggleSidebar]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [rows, categoriesByRepo] = await Promise.all([
          getRowsFromDB<Repository>("repository"),
          getRepositoryCategoriesByRepoId(),
        ]);
        if (cancelled) return;
        setRepositories(
          rows
            .map((row) => withResolvedCategories(row, categoriesByRepo))
            .sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
            ),
        );
      } catch (err) {
        console.error("Failed to load repositories:", err);
        if (!cancelled) {
          setLoadError("Couldn't load repositories. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let records = repositories;
    if (activeFilter !== "All") {
      records = records.filter((r) =>
        resolveRepositoryCategories(r).includes(activeFilter),
      );
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter((r) => {
      const categoryText = resolveRepositoryCategories(r)
        .map((cat) => REPOSITORY_CATEGORY_LABELS[cat])
        .join(" ");
      return (
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.run_id ?? "").toLowerCase().includes(q) ||
        r.kind.toLowerCase().includes(q) ||
        categoryText.toLowerCase().includes(q)
      );
    });
  }, [repositories, activeFilter, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<RepositoryCategory, Repository[]>();
    const groupKeys =
      activeFilter === "All"
        ? REPOSITORY_CATEGORY_OPTIONS.map((opt) => opt.value)
        : [activeFilter];

    for (const row of filtered) {
      const tags = resolveRepositoryCategories(row);
      for (const category of groupKeys) {
        if (!tags.includes(category)) continue;
        const list = map.get(category) ?? [];
        list.push(row);
        map.set(category, list);
      }
    }

    return groupKeys
      .filter((category) => map.has(category))
      .map((category) => ({
        category,
        label: REPOSITORY_CATEGORY_LABELS[category],
        items: map.get(category) ?? [],
      }));
  }, [filtered, activeFilter]);

  const initialData = useMemo((): RepositoryFormData | null => {
    if (!selected) return null;
    return {
      kind: selected.kind,
      title: selected.title,
      url: selected.url,
      description: selected.description || "",
      categories: resolveRepositoryCategories(selected),
      run_id: selected.run_id || "",
    };
  }, [selected]);

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
    setSelected(null);
  }, []);

  const handleAddSubmit = useCallback(
    async (formData: RepositoryFormData) => {
      const newId = crypto.randomUUID();
      const categories = Array.from(new Set(formData.categories));
      const payload = {
        id: newId,
        ...buildRepositoryPayload(formData),
      };

      setIsSaving(true);
      try {
        const saved = await saveDataToDB("repository", newId, payload);
        await replaceRepositoryCategories(newId, categories);
        setRepositories((prev) =>
          [
            { ...(saved as Repository), categories },
            ...prev,
          ].sort((a, b) =>
            a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
          ),
        );
        setIsAdding(false);
        showToast("Repository link added.", "success");
      } catch {
        showToast("Failed to save repository link. Please try again.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [showToast],
  );

  const handleEditSubmit = useCallback(
    async (formData: RepositoryFormData) => {
      if (!selected) return;
      const categories = Array.from(new Set(formData.categories));
      const payload = buildRepositoryPayload(formData);

      setIsSaving(true);
      try {
        const saved = await saveDataToDB("repository", selected.id, payload);
        await replaceRepositoryCategories(selected.id, categories);
        setRepositories((prev) =>
          prev
            .map((item) =>
              item.id === selected.id
                ? { ...item, ...(saved as Repository), categories }
                : item,
            )
            .sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
            ),
        );
        setIsEditing(false);
        setSelected(null);
        showToast("Repository link updated.", "success");
      } catch {
        showToast("Failed to update repository link.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [selected, showToast],
  );

  const deleteRecord = useDeleteRecord<Repository>(
    "repository",
    setRepositories,
    (_err, message) => showToast(message, "error"),
  );

  const handleDeleteRecord = useCallback(async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await deleteRecord(selected, () => {
        setShowDeleteConfirm(false);
        setSelected(null);
        showToast("Repository link deleted.", "success");
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selected, deleteRecord, showToast]);

  return (
    <div
      className={`space-y-8 mx-auto font-aileron w-full transition-all duration-300 ease-in-out ${
        isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      <PageHeader
        breadcrumbTrail={repositoriesBreadcrumbs}
        title="Source Repositories"
        subtitle="Central index of pipeline, dataset, sequence, and turnover-form links — optionally tied to a tracker run ID"
        actions={
          <>
            <div className="relative w-full min-[480px]:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                aria-label="Search repositories"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-surface rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setIsEditing(false);
                setIsAdding(true);
              }}
              className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Link
            </button>
          </>
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">Repositories</h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-2xl max-w-full">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActiveFilter(opt.value)}
                className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors ${
                  activeFilter === opt.value
                    ? "bg-white text-[#2a7797] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading repositories…" />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No repository links yet"
            description="Use Add Link to store a GitHub, Drive, or other source URL."
            action={
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-slate-900 text-white text-xs font-bold rounded-full"
              >
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            }
          />
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.category} className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#7a8e9b] font-quicksand">
                  {group.label}
                  <span className="ml-2 text-slate-400 font-medium normal-case tracking-normal">
                    ({group.items.length})
                  </span>
                </h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {group.items.map((row) => {
                    const tags = resolveRepositoryCategories(row);
                    return (
                      <li
                        key={`${group.category}-${row.id}`}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 leading-snug truncate">
                              {row.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {kindLabel(row.kind)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(row);
                                setIsAdding(false);
                                setIsEditing(true);
                              }}
                              className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <ChevronRight className="w-3 h-3 opacity-0 max-w-0 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] transition-all text-slate-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(row);
                                setShowDeleteConfirm(true);
                              }}
                              className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <CategoryChips
                          categories={tags}
                          labels={REPOSITORY_CATEGORY_LABELS}
                          styles={REPOSITORY_CATEGORY_STYLES}
                          maxVisible={3}
                        />

                        {row.description ? (
                          <p className="text-xs text-slate-500 line-clamp-2 font-aileron">
                            {row.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2 mt-auto">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-[#2a7797] hover:border-[#2a7797]/40 transition-colors max-w-full"
                            title={row.url}
                          >
                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Open link</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </a>

                          {row.run_id ? (
                            <Link
                              href={routes.services.trackerByRunId(row.run_id)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#f8eef7] border border-[#92298d]/25 text-[11px] font-bold text-[#92298d] hover:bg-[#f1e0ef] transition-colors font-mono"
                              title="Open matching Service Report Tracker row"
                            >
                              <Dna className="w-3.5 h-3.5" />
                              {row.run_id}
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <RepositoryModal
        isOpen={isPanelOpen}
        isAdding={isAdding}
        isSaving={isSaving}
        initialData={isAdding ? EMPTY_REPOSITORY_FORM : initialData}
        onClose={handleCloseModal}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selected?.title || "this repository link"}
        onClose={() => {
          setShowDeleteConfirm(false);
          if (!isEditing) setSelected(null);
        }}
        onConfirm={handleDeleteRecord}
        isDeleting={isDeleting}
      />
    </div>
  );
}
