"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ExternalLink,
  Plus,
  Inbox,
  Edit3,
  Trash2,
  FolderGit2,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import DeleteModal from "../../components/deletemodal";
import RepositoryModal, {
  EMPTY_REPOSITORY_FORM,
} from "../../components/repositorymodal";
import { CategoryChips } from "../../components/category-chips";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import { TruncatedText } from "../../components/cell-tooltip";
import {
  Repository,
  RepositoryFormData,
  RepositoryCategory,
  RepositoryKind,
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
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";
import { usePortal } from "../../components/portal-context";
import {
  matchesInvolvementFilter,
  REPOSITORY_INVOLVEMENT_FILTER_OPTIONS,
  type InvolvementFilter,
} from "@/lib/involvement-filter";

const KIND_FILTERS: { value: RepositoryKind | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...REPOSITORY_KIND_OPTIONS,
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
    is_personal: formData.is_personal,
  };
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<RepositoryKind | "All">("All");
  const [involvementFilter, setInvolvementFilter] =
    useState<InvolvementFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<
    RepositoryCategory | "All"
  >("All");
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPanelOpen = isAdding || isEditing;
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const { profile } = usePortal();
  const currentUserId = profile?.id ?? null;

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
    return repositories.filter((row) => {
      if (kindFilter !== "All" && row.kind !== kindFilter) return false;
      if (
        !matchesInvolvementFilter(involvementFilter, currentUserId, {
          ownerId: row.owner_id,
        })
      ) {
        return false;
      }
      const tags = resolveRepositoryCategories(row);
      if (categoryFilter !== "All" && !tags.includes(categoryFilter)) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const categoryText = tags
        .map((cat) => REPOSITORY_CATEGORY_LABELS[cat])
        .join(" ");
      return (
        row.title.toLowerCase().includes(q) ||
        row.url.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q) ||
        (row.run_id ?? "").toLowerCase().includes(q) ||
        kindLabel(row.kind).toLowerCase().includes(q) ||
        categoryText.toLowerCase().includes(q)
      );
    });
  }, [repositories, kindFilter, involvementFilter, categoryFilter, searchQuery, currentUserId]);

  const {
    sortConfig,
    handleSort,
    displayed,
    currentPage,
    setCurrentPage,
  } = useTableState<Repository>({
    items: filtered,
    itemsPerPage,
    resetKey: `${searchQuery}-${kindFilter}-${involvementFilter}-${categoryFilter}`,
    initialSort: { key: "title", direction: "asc" },
    customSorters: {
      kind: (a, b) => kindLabel(a.kind).localeCompare(kindLabel(b.kind)),
    },
  });

  const initialData = useMemo((): RepositoryFormData | null => {
    if (!selected) return null;
    return {
      kind: selected.kind,
      title: selected.title,
      url: selected.url,
      description: selected.description || "",
      categories: resolveRepositoryCategories(selected),
      run_id: selected.run_id || "",
      is_personal: Boolean(selected.is_personal),
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

  const columns: Column<Repository>[] = [
    {
      key: "title",
      label: "Title",
      width: "38%",
      sortable: true,
      render: (row) => (
        <div className="py-1 space-y-0.5 min-w-0">
          <TruncatedText
            text={row.title}
            className="font-bold text-[#11161a] leading-snug"
          />
          {row.is_personal ? (
            <span className="inline-flex text-[9px] font-extrabold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-quicksand">
              Personal
            </span>
          ) : null}
          {row.description?.trim() ? (
            <TruncatedText
              text={row.description}
              multiline
              lines={1}
              force
              className="text-[11px] text-slate-500 font-medium"
            />
          ) : null}
        </div>
      ),
    },
    {
      key: "kind",
      label: "Kind",
      width: "12%",
      sortable: true,
      render: (row) => (
        <TruncatedText
          text={kindLabel(row.kind)}
          className="text-xs text-slate-700 font-medium"
        />
      ),
    },
    {
      key: "categories",
      label: "Categories",
      width: "28%",
      render: (row) => (
        <CategoryChips
          categories={resolveRepositoryCategories(row)}
          labels={REPOSITORY_CATEGORY_LABELS}
          styles={REPOSITORY_CATEGORY_STYLES}
          maxVisible={3}
        />
      ),
    },
    {
      key: "url",
      label: "Open",
      width: "12%",
      render: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-[#2a7797] hover:border-[#2a7797]/40 transition-colors"
          title={row.url}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          Open
        </a>
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "10%",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelected(row);
              setIsAdding(false);
              setIsEditing(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all duration-200 shadow-sm"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-105" />
            <ChevronRight className="w-3 h-3 opacity-0 max-w-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] group-hover/btn:translate-x-0 transition-all duration-200 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(row);
              setShowDeleteConfirm(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-all duration-200 shadow-sm"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-105" />
            <ChevronRight className="w-3 h-3 opacity-0 max-w-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] group-hover/btn:translate-x-0 transition-all duration-200 text-red-300" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div
      className={`space-y-8 mx-auto pb-16 font-aileron w-full transition-all duration-300 ease-in-out ${
        isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      <PageHeader
        breadcrumbTrail={repositoriesBreadcrumbs}
        title="Source Repositories"
        subtitle="Directory of source links — filter by kind or category and open a URL from the row"
        actions={
          <>
            <div className="relative flex items-center bg-surface rounded-full border border-gray-200 px-3 h-10 shadow-sm">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                aria-label="Rows per page"
                className="bg-transparent text-xs text-slate-700 outline-none pr-1 cursor-pointer font-medium appearance-none"
              >
                <option value={5}>Show 5 rows</option>
                <option value={7}>Show 7 rows</option>
                <option value={10}>Show 10 rows</option>
                <option value={20}>Show 20 rows</option>
              </select>
            </div>
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

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 w-full max-w-full overflow-hidden">
        <div className="flex flex-col min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              List of Repositories
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-quicksand">
                Mine
              </span>
              <div
                role="group"
                aria-label="Filter by creator"
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-full overflow-x-auto max-w-full"
              >
                {REPOSITORY_INVOLVEMENT_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInvolvementFilter(opt.value)}
                    className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors ${
                      involvementFilter === opt.value
                        ? "bg-white text-[#2a7797] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full overflow-x-auto max-w-full">
              {KIND_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKindFilter(opt.value)}
                  className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors ${
                    kindFilter === opt.value
                      ? "bg-white text-[#2a7797] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label
                htmlFor="repository-category-filter"
                className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-quicksand"
              >
                Category
              </label>
              <select
                id="repository-category-filter"
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as RepositoryCategory | "All")
                }
                className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#4ec2bb]/30 font-aileron max-w-[200px]"
              >
                <option value="All">All categories</option>
                {REPOSITORY_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingState variant="skeleton" message="Loading repositories…" />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : repositories.length === 0 ? (
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
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching repository links"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="w-full max-w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[720px]">
            <DataTable
              columns={columns}
              data={displayed}
              sortConfig={sortConfig}
              onSort={handleSort}
              emptyMessage="No repository links match your filters."
            />
            <Pagination
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
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
