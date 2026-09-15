"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Gift,
  Edit3,
  Trash2,
  Plus,
  Inbox,
  ChevronRight,
  ChevronDown,
  Eye,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import WishlistModal from "../../components/wishlist-modal";
import { TruncatedText } from "../../components/cell-tooltip";
import {
  WishlistCategory,
  WishlistItem,
  WishlistItemFormData,
  WishlistStatus,
  WISHLIST_CATEGORY_OPTIONS,
  WISHLIST_STATUS_OPTIONS,
  User,
} from "../../../types/database";
import {
  getRowsFromDB,
  getUsersFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import { wishlistBreadcrumbs } from "@/lib/breadcrumbs";
import { routes } from "@/lib/routes";
import { describeSaveError } from "@/lib/db-errors";
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";
import { usePortal } from "../../components/portal-context";
import {
  buildWishlistItemPayload,
  buildWishlistNotesPayload,
  buildWishlistStatusNotesPayload,
  canAddWishlistItem,
  canChangeWishlistStatus,
  canDeleteWishlistItem,
  canEditWishlistNotes,
  canManageWishlistItem,
  emptyWishlistForm,
  formFromWishlistItem,
  formatWishlistAdded,
  isReceivedWishlistStatus,
  wishlistCategoryLabel,
} from "@/lib/wishlist";

const ITEMS_PER_PAGE = 10;

const STATUS_FILTERS: { value: WishlistStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...WISHLIST_STATUS_OPTIONS,
];

const selectBaseClass =
  "text-[10px] font-bold uppercase tracking-wide pl-4 pr-6 py-1 rounded-full border shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 text-center truncate";

function statusClass(status: WishlistStatus): string {
  switch (status) {
    case "in_process":
      return `${selectBaseClass} bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]`;
    case "received":
      return `${selectBaseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
    default:
      return `${selectBaseClass} bg-[#f5f5f5] text-[#616161] border-[#e0e0e0]`;
  }
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 mx-auto font-aileron max-w-[1240px]">
          <LoadingState message="Loading wish list…" />
        </div>
      }
    >
      <WishlistPageContent />
    </Suspense>
  );
}

function WishlistPageContent() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<WishlistStatus | "All">(
    "All",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    WishlistCategory | "All"
  >("All");

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<WishlistItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dismissedDeepLinkId, setDismissedDeepLinkId] = useState<string | null>(
    null,
  );
  const isPanelOpen = isAdding || isEditing;
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const { profile, realRole } = usePortal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemIdParam = searchParams.get("id")?.trim() ?? "";
  const addParam = searchParams.get("add") === "1";
  const canAdd = canAddWishlistItem(realRole);
  const canEditNotes = canEditWishlistNotes(realRole);
  const canChangeStatus = canChangeWishlistStatus(realRole);

  useEffect(() => {
    toggleSidebar(isPanelOpen);
  }, [isPanelOpen, toggleSidebar]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [users, rows] = await Promise.all([
          getUsersFromDB<User>(["team_lead", "team_member"]),
          getRowsFromDB<WishlistItem>("wishlist_item"),
        ]);
        if (cancelled) return;
        setAvailableUsers(users);
        setItems(rows);
      } catch (error) {
        console.error("Failed to load wish list:", error);
        if (!cancelled) {
          setLoadError("Couldn't load the wish list. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const userMap = useMemo(
    () => Object.fromEntries(availableUsers.map((u) => [u.id, u.name])),
    [availableUsers],
  );

  const emptyForm = useMemo(() => emptyWishlistForm(), []);

  const initialForm = useMemo((): WishlistItemFormData => {
    if (isAdding || !selected) return emptyForm;
    return formFromWishlistItem(selected);
  }, [emptyForm, isAdding, selected]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (activeFilter !== "All" && row.status !== activeFilter) return false;
      if (categoryFilter !== "All" && row.category !== categoryFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const requester = userMap[row.requester_id] ?? "";
      const searchPool = [
        row.title,
        row.description,
        row.vendor_or_link,
        row.notes,
        requester,
        wishlistCategoryLabel(row.category),
        row.status,
      ]
        .join(" ")
        .toLowerCase();
      return searchPool.includes(q);
    });
  }, [items, activeFilter, categoryFilter, searchQuery, userMap]);

  const { sortConfig, handleSort, displayed, currentPage, setCurrentPage } =
    useTableState<WishlistItem>({
      items: filtered,
      itemsPerPage: ITEMS_PER_PAGE,
      resetKey: `${searchQuery}-${activeFilter}-${categoryFilter}`,
      initialSort: { key: "created_at", direction: "desc" },
      pinToBottom: (row) => isReceivedWishlistStatus(row.status),
      customSorters: {
        quantity: (a, b) => a.quantity - b.quantity,
      },
    });

  const canManage = useCallback(
    (row: WishlistItem) =>
      canManageWishlistItem(realRole, profile?.id, row.requester_id),
    [realRole, profile?.id],
  );

  const canDelete = useCallback(
    (row: WishlistItem) =>
      canDeleteWishlistItem(realRole, profile?.id, row.requester_id),
    [realRole, profile?.id],
  );

  const openItem = useCallback((row: WishlistItem) => {
    setSelected(row);
    setIsAdding(false);
    setIsEditing(true);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!itemIdParam) {
      if (dismissedDeepLinkId) setDismissedDeepLinkId(null);
      return;
    }
    if (dismissedDeepLinkId === itemIdParam) return;
    if (selected?.id === itemIdParam) return;

    const match = items.find((row) => row.id === itemIdParam);
    if (match) {
      setSelected(match);
      setIsAdding(false);
      setIsEditing(true);
    }
  }, [isLoading, itemIdParam, dismissedDeepLinkId, selected?.id, items]);

  useEffect(() => {
    if (isLoading || !addParam || !canAdd || isAdding) return;
    setSelected(null);
    setIsEditing(false);
    setIsAdding(true);
    router.replace(routes.wishlist.list, { scroll: false });
  }, [isLoading, addParam, canAdd, isAdding, router]);

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
    setSelected(null);
    setDismissedDeepLinkId(itemIdParam || selected?.id || null);
    if (itemIdParam) {
      router.replace(routes.wishlist.list, { scroll: false });
    }
  }, [itemIdParam, router, selected]);

  const handleAddSubmit = useCallback(
    async (formData: WishlistItemFormData) => {
      const requesterId = profile?.id;
      if (!requesterId) {
        showToast("Couldn't identify the signed-in user.", "error");
        return;
      }

      const newId = crypto.randomUUID();
      const payload = {
        ...buildWishlistItemPayload(formData),
        requester_id: requesterId,
      };

      setIsSaving(true);
      try {
        const saved = await saveDataToDB("wishlist_item", newId, payload);
        setItems((prev) => [saved as WishlistItem, ...prev]);
        setIsAdding(false);
        showToast("Wish list item added.", "success");
      } catch (error) {
        console.error("Failed to save wish list item:", error);
        showToast(describeSaveError(error, "wishlist_item"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [profile?.id, showToast],
  );

  const handleEditSubmit = useCallback(
    async (formData: WishlistItemFormData) => {
      if (!selected) return;
      const payload = canManage(selected)
        ? buildWishlistItemPayload(formData)
        : canChangeStatus
          ? buildWishlistStatusNotesPayload(formData)
          : buildWishlistNotesPayload(formData);

      setIsSaving(true);
      try {
        const saved = await saveDataToDB("wishlist_item", selected.id, payload);
        setItems((prev) =>
          prev.map((row) =>
            row.id === selected.id
              ? { ...row, ...(saved as WishlistItem) }
              : row,
          ),
        );
        setIsEditing(false);
        setSelected(null);
        showToast("Wish list item updated.", "success");
      } catch (error) {
        console.error("Failed to update wish list item:", error);
        showToast(describeSaveError(error, "wishlist_item"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [selected, showToast, canManage, canChangeStatus],
  );

  const deleteRecord = useDeleteRecord<WishlistItem>(
    "wishlist_item",
    setItems,
    (_err, message) => showToast(message, "error"),
  );

  const handleDeleteRecord = useCallback(async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await deleteRecord(selected, () => {
        setShowDeleteConfirm(false);
        setSelected(null);
        showToast("Wish list item deleted.", "success");
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selected, deleteRecord, showToast]);

  const updateStatus = async (id: string, newStatus: WishlistStatus) => {
    const previous = items.find((row) => row.id === id);
    if (!previous) return;

    setItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, status: newStatus, updated_at: new Date().toISOString() }
          : row,
      ),
    );
    try {
      const saved = (await saveDataToDB("wishlist_item", id, {
        status: newStatus,
      })) as WishlistItem;
      setItems((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...saved } : row)),
      );
      if (selected?.id === id) {
        setSelected((current) =>
          current ? { ...current, ...saved } : current,
        );
      }
    } catch (error) {
      console.error("Error updating wish list status:", error);
      setItems((prev) =>
        prev.map((row) => (row.id === id ? previous : row)),
      );
      showToast("Failed to update status. Reverting.", "error");
    }
  };

  const columns: Column<WishlistItem>[] = [
    {
      key: "title",
      label: "Item",
      width: "22%",
      sortable: true,
      render: (row) => (
        <div className="py-1 space-y-1 min-w-0">
          <TruncatedText
            text={row.title}
            className="font-bold text-[#11161a] leading-snug"
          />
          {row.description?.trim() ? (
            <TruncatedText
              text={row.description}
              multiline
              lines={2}
              force
              className="text-[11px] text-slate-500 font-medium"
            />
          ) : null}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      width: "12%",
      sortable: true,
      render: (row) => (
        <TruncatedText
          text={wishlistCategoryLabel(row.category)}
          className="text-xs text-slate-700 font-medium"
        />
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      width: "7%",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium tabular-nums">
          {row.quantity}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "13%",
      sortable: true,
      render: (row) => {
        if (!canChangeStatus) {
          return (
            <span className={`${statusClass(row.status)} !cursor-default`}>
              {WISHLIST_STATUS_OPTIONS.find((o) => o.value === row.status)
                ?.label ?? row.status}
            </span>
          );
        }
        return (
          <div className="relative min-w-[115px] max-w-[140px] w-full">
            <select
              value={row.status}
              onChange={(e) =>
                updateStatus(row.id, e.target.value as WishlistStatus)
              }
              className={statusClass(row.status)}
              aria-label={`Status for ${row.title}`}
            >
              {WISHLIST_STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-slate-900 normal-case"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-current" />
          </div>
        );
      },
    },
    {
      key: "requester_id",
      label: "Requested by",
      width: "13%",
      render: (row) => (
        <TruncatedText
          text={userMap[row.requester_id] || "Unknown"}
          className="text-xs text-slate-700 font-medium"
        />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      width: "16%",
      render: (row) =>
        row.notes?.trim() ? (
          <TruncatedText
            text={row.notes}
            multiline
            lines={2}
            force
            className="text-xs text-slate-600 font-medium"
          />
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        ),
    },
    {
      key: "created_at",
      label: "Added",
      width: "10%",
      sortable: true,
      render: (row) => (
        <TruncatedText
          text={formatWishlistAdded(row.created_at)}
          className="text-xs text-slate-600 font-medium"
        />
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "8%",
      render: (row) => (
        <div className="flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={() => openItem(row)}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all"
            title={canManage(row) ? "Edit" : "Open item"}
          >
            {canManage(row) ? (
              <Edit3 className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <ChevronRight className="w-3 h-3 opacity-0 max-w-0 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] transition-all text-slate-400" />
          </button>
          {canDelete(row) ? (
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
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div
      className={`space-y-8 mx-auto font-aileron w-full transition-all duration-300 ease-in-out ${
        isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      <PageHeader
        breadcrumbTrail={wishlistBreadcrumbs}
        title="Bioinfo Wish List"
        subtitle="Shared board of things the bioinformatics lab wants"
        actions={
          <>
            <div className="relative w-full min-[480px]:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search wish list..."
                aria-label="Search wish list"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-surface rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
              />
            </div>
            {canAdd ? (
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setIsEditing(false);
                  setIsAdding(true);
                }}
                className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add item
              </button>
            ) : null}
          </>
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">Wish list</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full overflow-x-auto max-w-full">
              {STATUS_FILTERS.map((opt) => (
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

            <select
              id="wishlist-category-filter"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as WishlistCategory | "All")
              }
              className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#4ec2bb]/30 font-aileron max-w-[220px]"
            >
              <option value="All">All categories</option>
              {WISHLIST_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState variant="skeleton" message="Loading wish list…" />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No wish list items yet"
            description={
              canAdd
                ? "Add something the lab needs — cables, furniture, subscriptions, and the rest."
                : "Staff have not added any requests yet."
            }
            action={
              canAdd ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setIsAdding(true);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-4 bg-slate-900 text-white text-xs font-bold rounded-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Add item
                </button>
              ) : undefined
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching wish list items"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[960px]">
            <DataTable
              columns={columns}
              data={displayed}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={filtered.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <WishlistModal
        key={isAdding ? "new" : (selected?.id ?? "closed")}
        isOpen={isPanelOpen}
        isAdding={isAdding}
        isSaving={isSaving}
        initialData={initialForm}
        canEditDetails={selected ? canManage(selected) : canAdd}
        canChangeStatus={selected ? canChangeStatus : canAdd}
        canEditNotes={canEditNotes}
        onClose={handleCloseModal}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selected?.title || "this wish list item"}
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
