"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ShieldAlert,
  Edit3,
  Trash2,
  Plus,
  Inbox,
  ChevronRight,
  ChevronDown,
  Dna,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import IncidentReportModal from "../../components/incident-report-modal";
import { TruncatedText } from "../../components/cell-tooltip";
import {
  IncidentCategory,
  IncidentReport,
  IncidentReportFormData,
  IncidentStatus,
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_STATUS_OPTIONS,
  User,
} from "../../../types/database";
import { getRowsFromDB, getUsersFromDB, saveDataToDB } from "@/lib/supabase";
import { incidentsBreadcrumbs } from "@/lib/breadcrumbs";
import { routes } from "@/lib/routes";
import { describeSaveError } from "@/lib/db-errors";
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";
import { usePortal } from "../../components/portal-context";
import {
  buildIncidentReportPayload,
  canManageIncident,
  emptyIncidentForm,
  formFromIncident,
  formatIncidentWhen,
  incidentCategoryLabel,
  incidentLocationLabel,
  incidentSeverityLabel,
} from "@/lib/incident-reports";

const ITEMS_PER_PAGE = 10;

const STATUS_FILTERS: { value: IncidentStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...INCIDENT_STATUS_OPTIONS,
];

const selectBaseClass =
  "text-[10px] font-bold uppercase tracking-wide pl-4 pr-6 py-1 rounded-full border shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 text-center truncate";

function statusClass(status: IncidentStatus): string {
  switch (status) {
    case "investigating":
      return `${selectBaseClass} bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]`;
    case "resolved":
      return `${selectBaseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
    case "closed":
      return `${selectBaseClass} bg-[#e6f4f8] text-[#2a7797] border-[#b7d7e4]`;
    default:
      return `${selectBaseClass} bg-[#f5f5f5] text-[#616161] border-[#e0e0e0]`;
  }
}

function severityClass(severity: IncidentReport["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-[#c62828] text-white border-[#b71c1c]";
    case "high":
      return "bg-[#ffebee] text-[#c62828] border-[#ffcdd2]";
    case "medium":
      return "bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]";
    default:
      return "bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]";
  }
}

export default function IncidentsPage() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<IncidentStatus | "All">(
    "All",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    IncidentCategory | "All"
  >("All");

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPanelOpen = isAdding || isEditing;
  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const { profile, realRole } = usePortal();

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
          getRowsFromDB<IncidentReport>("incident_report"),
        ]);
        if (cancelled) return;
        setAvailableUsers(users);
        setReports(rows);
      } catch (error) {
        console.error("Failed to load incident reports:", error);
        if (!cancelled) {
          setLoadError(
            "Couldn't load incident reports. Please refresh the page.",
          );
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

  const emptyForm = useMemo(() => emptyIncidentForm(), []);

  const initialForm = useMemo((): IncidentReportFormData => {
    if (isAdding || !selected) return emptyForm;
    return formFromIncident(selected);
  }, [emptyForm, isAdding, selected]);

  const filtered = useMemo(() => {
    return reports.filter((row) => {
      if (activeFilter !== "All" && row.status !== activeFilter) return false;
      if (categoryFilter !== "All" && row.category !== categoryFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const reporter = userMap[row.reporter_id] ?? "";
      const searchPool = [
        row.title,
        row.description,
        row.location_detail,
        row.people_involved,
        row.related_run_id,
        row.immediate_action,
        row.follow_up,
        reporter,
        incidentCategoryLabel(row.category),
        incidentLocationLabel(row.location),
        incidentSeverityLabel(row.severity),
        row.status,
      ]
        .join(" ")
        .toLowerCase();
      return searchPool.includes(q);
    });
  }, [reports, activeFilter, categoryFilter, searchQuery, userMap]);

  const {
    sortConfig,
    handleSort,
    displayed,
    currentPage,
    setCurrentPage,
  } = useTableState<IncidentReport>({
    items: filtered,
    itemsPerPage: ITEMS_PER_PAGE,
    resetKey: `${searchQuery}-${activeFilter}-${categoryFilter}`,
    initialSort: { key: "incident_date", direction: "desc" },
    pinToBottom: (row) => row.status === "closed",
  });

  const canManage = useCallback(
    (row: IncidentReport) =>
      canManageIncident(realRole, profile?.id, row.reporter_id),
    [realRole, profile?.id],
  );

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
    setSelected(null);
  }, []);

  const handleAddSubmit = useCallback(
    async (formData: IncidentReportFormData) => {
      const reporterId = profile?.id;
      if (!reporterId) {
        showToast("Couldn't identify the signed-in user.", "error");
        return;
      }

      const newId = crypto.randomUUID();
      const payload = {
        ...buildIncidentReportPayload(formData),
        reporter_id: reporterId,
      };

      setIsSaving(true);
      try {
        const saved = await saveDataToDB("incident_report", newId, payload);
        setReports((prev) => [saved as IncidentReport, ...prev]);
        setIsAdding(false);
        showToast("Incident report logged.", "success");
      } catch (error) {
        console.error("Failed to save incident report:", error);
        showToast(describeSaveError(error, "incident_report"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [profile?.id, showToast],
  );

  const handleEditSubmit = useCallback(
    async (formData: IncidentReportFormData) => {
      if (!selected) return;
      const payload = buildIncidentReportPayload(formData);

      setIsSaving(true);
      try {
        const saved = await saveDataToDB("incident_report", selected.id, payload);
        setReports((prev) =>
          prev.map((item) =>
            item.id === selected.id
              ? { ...item, ...(saved as IncidentReport) }
              : item,
          ),
        );
        setIsEditing(false);
        setSelected(null);
        showToast("Incident report updated.", "success");
      } catch (error) {
        console.error("Failed to update incident report:", error);
        showToast(describeSaveError(error, "incident_report"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [selected, showToast],
  );

  const deleteRecord = useDeleteRecord<IncidentReport>(
    "incident_report",
    setReports,
    (_err, message) => showToast(message, "error"),
  );

  const handleDeleteRecord = useCallback(async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await deleteRecord(selected, () => {
        setShowDeleteConfirm(false);
        setSelected(null);
        showToast("Incident report deleted.", "success");
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selected, deleteRecord, showToast]);

  const updateStatus = async (id: string, newStatus: IncidentStatus) => {
    const previous = reports.find((row) => row.id === id)?.status;
    setReports((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, status: newStatus, updated_at: new Date().toISOString() }
          : row,
      ),
    );
    try {
      await saveDataToDB("incident_report", id, { status: newStatus });
    } catch (error) {
      console.error("Error updating incident status:", error);
      setReports((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, status: previous ?? row.status } : row,
        ),
      );
      showToast("Failed to update status. Reverting.", "error");
    }
  };

  const columns: Column<IncidentReport>[] = [
    {
      key: "title",
      label: "Incident",
      width: "22%",
      sortable: true,
      render: (row) => (
        <div className="py-1 space-y-1 min-w-0">
          <TruncatedText
            text={row.title}
            className="font-bold text-[#11161a] leading-snug"
          />
          <TruncatedText
            text={row.description}
            multiline
            lines={2}
            force={Boolean(row.description.trim())}
            className="text-[11px] text-slate-500 font-medium"
          />
        </div>
      ),
    },
    {
      key: "incident_date",
      label: "When",
      width: "12%",
      sortable: true,
      render: (row) => (
        <TruncatedText
          text={formatIncidentWhen(row.incident_date, row.incident_time)}
          className="text-xs text-slate-600 font-medium"
        />
      ),
    },
    {
      key: "category",
      label: "Category",
      width: "14%",
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 min-w-0">
          <TruncatedText
            text={incidentCategoryLabel(row.category)}
            className="text-xs text-slate-700 font-medium"
          />
          <TruncatedText
            text={
              row.location_detail?.trim()
                ? `${incidentLocationLabel(row.location)} · ${row.location_detail}`
                : incidentLocationLabel(row.location)
            }
            className="text-[11px] text-slate-400"
          />
        </div>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      width: "10%",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${severityClass(row.severity)}`}
        >
          {incidentSeverityLabel(row.severity)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "13%",
      sortable: true,
      render: (row) => {
        if (!canManage(row)) {
          return (
            <span className={`${statusClass(row.status)} !cursor-default`}>
              {INCIDENT_STATUS_OPTIONS.find((o) => o.value === row.status)
                ?.label ?? row.status}
            </span>
          );
        }
        return (
          <div className="relative min-w-[115px] max-w-[140px] w-full">
            <select
              value={row.status}
              onChange={(e) =>
                updateStatus(row.id, e.target.value as IncidentStatus)
              }
              className={statusClass(row.status)}
              aria-label={`Status for ${row.title}`}
            >
              {INCIDENT_STATUS_OPTIONS.map((opt) => (
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
      key: "reporter_id",
      label: "Reporter",
      width: "12%",
      render: (row) => (
        <div className="space-y-0.5 min-w-0">
          <TruncatedText
            text={userMap[row.reporter_id] || "Unknown"}
            className="text-xs text-slate-700 font-medium"
          />
          {row.related_run_id ? (
            <Link
              href={routes.services.trackerByRunId(row.related_run_id)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#92298d] hover:underline font-mono"
              title="Open matching Service Report Tracker row"
            >
              <Dna className="w-3 h-3" />
              {row.related_run_id}
            </Link>
          ) : null}
        </div>
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "8%",
      render: (row) =>
        canManage(row) ? (
          <div className="flex items-center justify-center gap-0.5">
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
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
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
        breadcrumbTrail={incidentsBreadcrumbs}
        title="Incident Reports"
        subtitle="Staff log of lab, equipment, sample, and operational incidents"
        actions={
          <>
            <div className="relative w-full min-[480px]:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search incidents..."
                aria-label="Search incident reports"
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
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log Incident
            </button>
          </>
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              List of Incidents
            </h2>
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
              id="incident-category-filter"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as IncidentCategory | "All")
              }
              className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#4ec2bb]/30 font-aileron max-w-[220px]"
            >
              <option value="All">All categories</option>
              {INCIDENT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState variant="skeleton" message="Loading incident reports…" />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No incident reports yet"
            description="Log an incident so the team has a dated record of what happened."
            action={
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-slate-900 text-white text-xs font-bold rounded-full"
              >
                <Plus className="w-3.5 h-3.5" /> Log Incident
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching incident reports"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[920px]">
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

      <IncidentReportModal
        key={isAdding ? "new" : (selected?.id ?? "closed")}
        isOpen={isPanelOpen}
        isAdding={isAdding}
        isSaving={isSaving}
        initialData={initialForm}
        onClose={handleCloseModal}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selected?.title || "this incident report"}
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
