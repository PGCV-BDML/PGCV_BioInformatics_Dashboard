"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Inbox,
  Edit3,
  Trash2,
  ListOrdered,
  Flag,
} from "lucide-react";
import { PageHeader } from "../../../components/pageheader";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/state-views";
import DeleteModal from "../../../components/deletemodal";
import CovidRunModal, {
  EMPTY_COVID_RUN_FORM,
} from "../../../components/covid-run-modal";
import DataTable, { Column } from "../../../components/datatable";
import Pagination from "../../../components/pagination";
import { TruncatedText } from "../../../components/cell-tooltip";
import {
  CovidSequencingRun,
  CovidSequencingRunFormData,
} from "../../../../types/database";
import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import { covidSampleTrackerBreadcrumbs } from "@/lib/breadcrumbs";
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../../components/dashboard-ui-context";
import { useToast } from "../../../components/toast";
import { formatDate } from "@/lib/utils";
import { describeSaveError } from "@/lib/db-errors";
import {
  availableRunYears,
  getCovidRunSummaryStats,
  pctAssigned,
  runYear,
} from "@/lib/covid-run-summary";

const ITEMS_PER_PAGE = 15;
const ALL = "all";

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function toFormData(row: CovidSequencingRun): CovidSequencingRunFormData {
  return {
    run_number: String(row.run_number),
    run_id: row.run_id ?? "",
    sequencer: row.sequencer ?? "",
    extraction_number: row.extraction_number ?? "",
    date_received: row.date_received ?? "",
    date_loaded: row.date_loaded ?? "",
    samples_sequenced: String(row.samples_sequenced ?? 0),
    lineage_assigned:
      row.lineage_assigned === null || row.lineage_assigned === undefined
        ? ""
        : String(row.lineage_assigned),
    uploaded_gisaid: !!row.uploaded_gisaid,
    uploaded_islap: !!row.uploaded_islap,
    comments: row.comments ?? "",
    review_flag: row.review_flag ?? "",
  };
}

function formToPayload(form: CovidSequencingRunFormData) {
  const lineageRaw = form.lineage_assigned.trim();
  return {
    run_number: Number(form.run_number),
    run_id: form.run_id.trim() || null,
    sequencer: form.sequencer.trim() || null,
    extraction_number: form.extraction_number.trim() || null,
    date_received: form.date_received.trim() || null,
    date_loaded: form.date_loaded.trim() || null,
    samples_sequenced: Number(form.samples_sequenced),
    lineage_assigned: lineageRaw === "" ? null : Number(lineageRaw),
    uploaded_gisaid: form.uploaded_gisaid,
    uploaded_islap: form.uploaded_islap,
    comments: form.comments.trim() || null,
    review_flag: form.review_flag.trim() || null,
  };
}

function UploadBadge({ yes }: { yes: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        yes
          ? "bg-[#eaf7ee] text-[#2e7d32]"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {yes ? "Y" : "N"}
    </span>
  );
}

export default function RunSummaryPage() {
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("run_id")?.trim() ?? "";

  const [runs, setRuns] = useState<CovidSequencingRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(runIdParam);
  const [yearFilter, setYearFilter] = useState<string>(ALL);
  const [sequencerFilter, setSequencerFilter] = useState<string>(ALL);
  const [uploadFilter, setUploadFilter] = useState<string>(ALL);
  const [reviewOnly, setReviewOnly] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<CovidSequencingRun | null>(null);
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
        const rows = await getRowsFromDB<CovidSequencingRun>(
          "covid_sequencing_run",
        );
        if (cancelled) return;
        setRuns(
          [...rows].sort((a, b) => b.run_number - a.run_number),
        );
      } catch (err) {
        console.error("Failed to load COVID-19 Sample Tracker:", err);
        if (!cancelled) {
          setLoadError(
            "Couldn't load COVID-19 Sample Tracker. Apply the latest Supabase migration, then refresh.",
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

  const years = useMemo(() => availableRunYears(runs), [runs]);

  const stats = useMemo(() => getCovidRunSummaryStats(runs), [runs]);

  const filtered = useMemo(() => {
    let records = runs;

    if (yearFilter !== ALL) {
      records = records.filter((r) => runYear(r) === yearFilter);
    }
    if (sequencerFilter !== ALL) {
      if (sequencerFilter === "unrecorded") {
        records = records.filter((r) => !r.sequencer?.trim());
      } else {
        records = records.filter((r) => r.sequencer === sequencerFilter);
      }
    }
    if (uploadFilter === "gisaid") {
      records = records.filter((r) => r.uploaded_gisaid);
    } else if (uploadFilter === "islap") {
      records = records.filter((r) => r.uploaded_islap);
    } else if (uploadFilter === "neither") {
      records = records.filter((r) => !r.uploaded_gisaid && !r.uploaded_islap);
    }
    if (reviewOnly) {
      records = records.filter((r) => !!r.review_flag?.trim());
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;

    return records.filter((r) => {
      return (
        String(r.run_number).includes(q) ||
        (r.run_id ?? "").toLowerCase().includes(q) ||
        (r.sequencer ?? "").toLowerCase().includes(q) ||
        (r.extraction_number ?? "").toLowerCase().includes(q) ||
        (r.comments ?? "").toLowerCase().includes(q) ||
        (r.review_flag ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    runs,
    yearFilter,
    sequencerFilter,
    uploadFilter,
    reviewOnly,
    searchQuery,
  ]);

  const {
    sortConfig,
    handleSort,
    displayed,
    currentPage,
    setCurrentPage,
  } = useTableState<CovidSequencingRun>({
    items: filtered,
    itemsPerPage: ITEMS_PER_PAGE,
    resetKey: `${searchQuery}-${yearFilter}-${sequencerFilter}-${uploadFilter}-${reviewOnly}`,
    initialSort: { key: "run_number", direction: "desc" },
    customSorters: {
      run_number: (a, b) => a.run_number - b.run_number,
      samples_sequenced: (a, b) => a.samples_sequenced - b.samples_sequenced,
      lineage_assigned: (a, b) =>
        (a.lineage_assigned ?? -1) - (b.lineage_assigned ?? -1),
      date_loaded: (a, b) =>
        (a.date_loaded ?? "").localeCompare(b.date_loaded ?? ""),
      date_received: (a, b) =>
        (a.date_received ?? "").localeCompare(b.date_received ?? ""),
    },
  });

  const initialData = useMemo((): CovidSequencingRunFormData | null => {
    if (!selected) return null;
    return toFormData(selected);
  }, [selected]);

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
    setSelected(null);
  }, []);

  const handleAddSubmit = useCallback(
    async (formData: CovidSequencingRunFormData) => {
      const newId = crypto.randomUUID();
      const payload = { id: newId, ...formToPayload(formData) };

      setIsSaving(true);
      try {
        const saved = await saveDataToDB(
          "covid_sequencing_run",
          newId,
          payload,
        );
        setRuns((prev) =>
          [saved as CovidSequencingRun, ...prev].sort(
            (a, b) => b.run_number - a.run_number,
          ),
        );
        setIsAdding(false);
        showToast("Sequencing run added.", "success");
      } catch (err) {
        showToast(describeSaveError(err, "covid_sequencing_run"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [showToast],
  );

  const handleEditSubmit = useCallback(
    async (formData: CovidSequencingRunFormData) => {
      if (!selected) return;
      const payload = formToPayload(formData);

      setIsSaving(true);
      try {
        const saved = await saveDataToDB(
          "covid_sequencing_run",
          selected.id,
          payload,
        );
        setRuns((prev) =>
          prev
            .map((item) =>
              item.id === selected.id
                ? { ...item, ...(saved as CovidSequencingRun) }
                : item,
            )
            .sort((a, b) => b.run_number - a.run_number),
        );
        setIsEditing(false);
        setSelected(null);
        showToast("Sequencing run updated.", "success");
      } catch (err) {
        showToast(describeSaveError(err, "covid_sequencing_run"), "error");
      } finally {
        setIsSaving(false);
      }
    },
    [selected, showToast],
  );

  const deleteRecord = useDeleteRecord<CovidSequencingRun>(
    "covid_sequencing_run",
    setRuns,
    (_err, message) => showToast(message, "error"),
  );

  const handleDeleteRecord = useCallback(async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await deleteRecord(selected, () => {
        setShowDeleteConfirm(false);
        setSelected(null);
        showToast("Sequencing run deleted.", "success");
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selected, deleteRecord, showToast]);

  const columns: Column<CovidSequencingRun>[] = [
    {
      key: "run_number",
      label: "Run #",
      width: "6%",
      sortable: true,
      render: (r) => (
        <span className="font-bold text-[#11161a] tabular-nums">
          {r.run_number}
        </span>
      ),
    },
    {
      key: "run_id",
      label: "Run ID",
      width: "10%",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-[11px]">{dash(r.run_id)}</span>
      ),
    },
    {
      key: "sequencer",
      label: "Sequencer",
      width: "10%",
      sortable: true,
      render: (r) => <TruncatedText text={dash(r.sequencer)} />,
    },
    {
      key: "date_received",
      label: "Received",
      width: "9%",
      sortable: true,
      render: (r) => (
        <span className="tabular-nums">
          {formatDate(r.date_received) || "—"}
        </span>
      ),
    },
    {
      key: "date_loaded",
      label: "Loaded",
      width: "9%",
      sortable: true,
      render: (r) => (
        <span className="tabular-nums">
          {formatDate(r.date_loaded) || "—"}
        </span>
      ),
    },
    {
      key: "samples_sequenced",
      label: "Samples",
      shortLabel: "N",
      width: "7%",
      sortable: true,
      render: (r) => (
        <span className="tabular-nums font-semibold">
          {r.samples_sequenced.toLocaleString()}
        </span>
      ),
    },
    {
      key: "lineage_assigned",
      label: "Assigned",
      width: "8%",
      sortable: true,
      render: (r) => {
        const pct = pctAssigned(r);
        return (
          <span className="tabular-nums" title={r.review_flag ?? undefined}>
            {r.lineage_assigned == null
              ? "—"
              : r.lineage_assigned.toLocaleString()}
            {pct != null ? (
              <span className="text-slate-400 ml-1 text-[10px]">
                ({pct.toFixed(0)}%)
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "uploaded_gisaid",
      label: "GISAID",
      width: "6%",
      sortable: true,
      render: (r) => <UploadBadge yes={r.uploaded_gisaid} />,
    },
    {
      key: "uploaded_islap",
      label: "ISLAP",
      width: "6%",
      sortable: true,
      render: (r) => <UploadBadge yes={r.uploaded_islap} />,
    },
    {
      key: "review_flag",
      label: "Flag",
      width: "12%",
      sortable: true,
      render: (r) =>
        r.review_flag ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-1.5 py-0.5 max-w-full"
            title={r.review_flag}
          >
            <Flag className="w-3 h-3 shrink-0" />
            <span className="truncate">{r.review_flag}</span>
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "actions",
      label: "",
      width: "8%",
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={() => {
              setSelected(r);
              setIsAdding(false);
              setIsEditing(true);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-all"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(r);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const selectClass =
    "h-9 px-3 pr-8 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#4ec2bb]";

  return (
    <div
      className={`space-y-6 mx-auto font-aileron w-full transition-all duration-300 ease-in-out ${
        isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      <PageHeader
        breadcrumbTrail={covidSampleTrackerBreadcrumbs}
        title="COVID-19 Sample Tracker"
        subtitle="Genomic surveillance sequencing runs — separate from client Service Report Tracker"
        actions={
          <>
            <div className="relative w-full min-[480px]:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search run ID, number…"
                aria-label="Search sequencing runs"
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
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Run
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-surface px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[1px] text-slate-500">
            Runs
          </p>
          <p className="text-xl font-bold text-slate-800 tabular-nums mt-0.5">
            {stats.totalRuns.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-surface px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[1px] text-slate-500">
            Samples
          </p>
          <p className="text-xl font-bold text-slate-800 tabular-nums mt-0.5">
            {stats.totalSamples.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-surface px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[1px] text-slate-500">
            GISAID uploaded
          </p>
          <p className="text-xl font-bold text-slate-800 tabular-nums mt-0.5">
            {stats.gisaidUploaded}
            <span className="text-sm font-semibold text-slate-400 ml-1">
              / {stats.totalRuns}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-surface px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[1px] text-slate-500">
            ISLAP uploaded
          </p>
          <p className="text-xl font-bold text-slate-800 tabular-nums mt-0.5">
            {stats.islapUploaded}
            <span className="text-sm font-semibold text-slate-400 ml-1">
              / {stats.totalRuns}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              Sequencing Runs
            </h2>
            {stats.reviewFlagged > 0 ? (
              <span className="ml-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-full px-2 py-0.5">
                {stats.reviewFlagged} flagged
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by sequencer"
              value={sequencerFilter}
              onChange={(e) => setSequencerFilter(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>All sequencers</option>
              <option value="NextSeq1000">NextSeq1000</option>
              <option value="iSeq100">iSeq100</option>
              <option value="unrecorded">Not recorded</option>
            </select>
            <select
              aria-label="Filter by upload status"
              value={uploadFilter}
              onChange={(e) => setUploadFilter(e.target.value)}
              className={selectClass}
            >
              <option value={ALL}>All uploads</option>
              <option value="gisaid">GISAID yes</option>
              <option value="islap">ISLAP yes</option>
              <option value="neither">Neither uploaded</option>
            </select>
            <button
              type="button"
              onClick={() => setReviewOnly((v) => !v)}
              className={`h-9 px-3 rounded-full text-[11px] font-semibold border transition-colors ${
                reviewOnly
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800"
              }`}
            >
              Review flag only
            </button>
          </div>
        </div>

        {loadError ? (
          <ErrorState message={loadError} />
        ) : isLoading ? (
          <LoadingState message="Loading sequencing runs…" />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No sequencing runs yet"
            description="Seed from the COVID Run_Summary sheet or add a run manually."
            action={
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-slate-900 text-white text-xs font-bold rounded-full"
              >
                <Plus className="w-3.5 h-3.5" /> Add Run
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching runs"
            description="Try adjusting your search or filters."
          />
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[980px]">
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

      <CovidRunModal
        isOpen={isPanelOpen}
        isAdding={isAdding}
        isSaving={isSaving}
        initialData={isAdding ? EMPTY_COVID_RUN_FORM : initialData}
        onClose={handleCloseModal}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={
          selected
            ? `run ${selected.run_number}${selected.run_id ? ` (${selected.run_id})` : ""}`
            : "this sequencing run"
        }
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
