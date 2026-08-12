"use client";

import {
  Search,
  Dna,
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Inbox,
  ExternalLink,
  Edit3,
  Trash2,
  MessageSquareWarning,
} from "lucide-react";
import {
  getCurrentUser,
  getRowsFromDB,
  getUsersFromDB,
  saveDataToDB,
  deleteDataFromDB,
  supabase,
} from "@/lib/supabase";
import { syncAnalysisToTaskSafe } from "@/lib/sync-analysis-task";
import {
  deriveLegacyStatus,
  displayAnalysisLabel,
  isChangesRequestedLabel,
  isRevisionRequestedLabel,
  labelFromAnalysisStatus,
  nextServiceReportNumber,
  parseServiceReportNumber,
  MANUAL_STATUS_OF_SUBMISSION_OPTIONS,
  STATUS_OF_COMPLETION_OPTIONS,
} from "@/lib/analysis-tracker";
import {
  deleteAllServiceReportPdfs,
  deleteServiceReportPdf,
  getServiceReportSignedUrl,
  uploadServiceReportPdf,
  type ServiceReportFileMeta,
} from "@/lib/service-report-file";
import {
  Analysis,
  AnalysisStatus,
  Project,
  User,
  Service,
  ServiceCategory,
  Repository,
} from "../../../../types/database";
import { servicesBreadcrumbs } from "@/lib/breadcrumbs";
import { useToast } from "../../../components/toast";
import DeleteModal from "../../../components/deletemodal";
import Pagination from "../../../components/pagination";
import DataTable, { Column } from "../../../components/datatable";
import { TruncatedText } from "../../../components/cell-tooltip";
import AnalysisSidebar, {
  AnalysisFormState,
  EMPTY_ANALYSIS_FORM,
  type ApproverOption,
} from "../../../components/analysismodal";
import ServiceReportModal, {
  type ServiceReportUploadResult,
} from "../../../components/service-report-modal";
import ReviewCommentsModal from "../../../components/review-comments-modal";
import { ServiceReportWorkflowInfoButton } from "../../../components/service-report-workflow-modal";
import { PageHeader } from "../../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../../components/state-views";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../../components/dashboard-ui-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  getAnalysisYear,
  getAvailableAnalysisYears,
} from "@/lib/analysis-dashboard-stats";
import {
  buildClientIdLookup,
  mapClientRowToRecord,
  matchClientByExternalId,
  type ClientMatchStatus,
  type SupabaseClientRow,
} from "@/lib/clients";
import { routes } from "@/lib/routes";

function normalizeRunId(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

interface ServiceProjectRow {
  id: string;
  service_report_number: string;
  service_report_date: string;
  application: string;
  analysis_classification: string;
  client: string;
  client_type: string;
  external_client_id: string;
  external_project_id: string;
  sample_type: string;
  run_id: string;
  status_of_completion: string;
  status_of_review: string;
  status_of_submission: string;
  report_link: string;
  service_report_file_path: string;
  service_report_file_name: string;
  service_report_file_size: number | null;
  client_sequences_link: string;
  notes: string;
  linked_project_id: string;
  /** Soft match: external_client_id ↔ client.client_id */
  client_match: ClientMatchStatus;
  matched_client_uuid: string;
  matched_client_name: string;
  /** Display helpers / legacy */
  project_name: string;
  analysis_pipeline: string;
  status: AnalysisStatus;
  assignee: string;
  started: string;
  completed: string;
  service_name: string | null;
  service_category: ServiceCategory | null;
  delivered_by?: string;
  delivered_at?: string;
  client_acknowledged_at?: string;
  reviewer_user_id: string;
  approver_user_id: string;
}

const FILTER_OPTIONS = [
  { value: "All", label: "All Records" },
  { value: "ongoing", label: "On-going" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

const ITEMS_PER_PAGE = 15;

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

function dash(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t || "—";
}

function rowToFormState(row: ServiceProjectRow): AnalysisFormState {
  return {
    service_report_number: row.service_report_number,
    service_report_date: row.service_report_date,
    pipeline: row.analysis_classification,
    application: row.application,
    client_name: row.client === "—" ? "" : row.client,
    client_type: row.client_type,
    external_client_id: row.external_client_id,
    external_project_id: row.external_project_id,
    sample_type: row.sample_type,
    run_id: row.run_id,
    status_of_completion: row.status_of_completion,
    status_of_review: row.status_of_review,
    status_of_submission: row.status_of_submission,
    service_report_link: row.report_link,
    service_report_file_path: row.service_report_file_path,
    service_report_file_name: row.service_report_file_name,
    service_report_file_size:
      row.service_report_file_size != null
        ? String(row.service_report_file_size)
        : "",
    client_sequences_link: row.client_sequences_link,
    notes: row.notes,
    project_id: row.linked_project_id,
    assignee: row.assignee === "Unassigned" ? "" : row.assignee,
    reviewer_user_id: row.reviewer_user_id ?? "",
    approver_user_id: row.approver_user_id ?? "",
  };
}

function analysisToRow(
  a: Analysis,
  opts: {
    projectName?: string | null;
    clientFromProject?: string | null;
    serviceName?: string | null;
    serviceCategory?: ServiceCategory | null;
    assigneeName: string;
    clientMatch?: ReturnType<typeof matchClientByExternalId>;
  },
): ServiceProjectRow {
  const srDate = a.service_report_date
    ? a.service_report_date
    : a.started_at
      ? (a.started_at.split("T")[0] ?? "")
      : "";
  const match = opts.clientMatch;
  return {
    id: a.id,
    service_report_number: a.service_report_number ?? "",
    service_report_date: srDate,
    application: a.application ?? "",
    analysis_classification: a.pipeline ?? "",
    client:
      a.client_name ||
      match?.client?.name ||
      opts.clientFromProject ||
      "",
    client_type: a.client_type ?? "",
    external_client_id: a.external_client_id ?? "",
    external_project_id: a.external_project_id ?? "",
    sample_type: a.sample_type ?? "",
    run_id: a.run_id ?? "",
    status_of_completion: a.status_of_completion ?? "",
    status_of_review: a.status_of_review ?? "",
    status_of_submission: a.status_of_submission ?? "",
    report_link: a.service_report_link ?? "",
    service_report_file_path: a.service_report_file_path ?? "",
    service_report_file_name: a.service_report_file_name ?? "",
    service_report_file_size: a.service_report_file_size ?? null,
    client_sequences_link: a.client_sequences_link ?? "",
    notes: a.notes ?? "",
    linked_project_id: a.project_id ?? "",
    client_match: match?.status ?? "empty",
    matched_client_uuid: match?.client?.id ?? "",
    matched_client_name: match?.client?.name ?? "",
    project_name:
      a.service_report_number ||
      a.external_project_id ||
      opts.projectName ||
      "Untitled analysis",
    analysis_pipeline: displayAnalysisLabel(a.pipeline, a.application),
    status: a.status as AnalysisStatus,
    assignee: opts.assigneeName,
    started: srDate || "—",
    completed: a.completed_at ? (a.completed_at.split("T")[0] ?? "—") : "—",
    service_name: opts.serviceName ?? null,
    service_category: opts.serviceCategory ?? null,
    reviewer_user_id: a.reviewer_user_id ?? "",
    approver_user_id: a.approver_user_id ?? "",
  };
}

export default function ServiceReportTrackerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year")?.trim() ?? "";
  const pipelineParam = searchParams.get("pipeline")?.trim() ?? "";
  const runIdParam = searchParams.get("run_id")?.trim() ?? "";

  const [servicesList, setServicesList] = useState<ServiceProjectRow[]>([]);
  const [searchQuery, setSearchQuery] = useState(runIdParam);
  const [activeFilter, setActiveFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState(yearParam || "all");
  const [pipelineFilter, setPipelineFilter] = useState(pipelineParam);
  const [runIdFilter, setRunIdFilter] = useState(runIdParam);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<
    { id: string; name: string; client: string; service_name: string | null; service_category: ServiceCategory | null }[]
  >([]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [availableReviewers, setAvailableReviewers] = useState<ApproverOption[]>([]);
  const [availableApprovers, setAvailableApprovers] = useState<ApproverOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  /** run_id (normalized) → repository URL from Repositories module */
  const [runIdRepoLinks, setRunIdRepoLinks] = useState<Map<string, string>>(
    () => new Map(),
  );
  /** Soft-match lookup: normalized client.client_id → client summary */
  const clientIdLookupRef = useRef(buildClientIdLookup([]));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<AnalysisFormState>(EMPTY_ANALYSIS_FORM);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ServiceProjectRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedReportRow, setSelectedReportRow] =
    useState<ServiceProjectRow | null>(null);
  const [commentsRow, setCommentsRow] = useState<ServiceProjectRow | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [slideStyle, setSlideStyle] = useState({ left: 0, width: 0 });

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();

  useEffect(() => {
    setYearFilter(yearParam || "all");
    setPipelineFilter(pipelineParam);
    setRunIdFilter(runIdParam);
    if (runIdParam) {
      setSearchQuery(runIdParam);
    }
  }, [yearParam, pipelineParam, runIdParam]);

  useEffect(() => {
    toggleSidebar(isSidebarOpen);
  }, [isSidebarOpen, toggleSidebar]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [analyses, projects, clientRows, services, users, user, repositories] =
          await Promise.all([
            getRowsFromDB<Analysis>("analysis"),
            getRowsFromDB<Project>("project"),
            getRowsFromDB<SupabaseClientRow>("client"),
            getRowsFromDB<Service>("service"),
            getUsersFromDB([
              "team_lead",
              "team_member",
              "reviewing_officer",
              "approving_officer",
            ]),
            getCurrentUser(),
            getRowsFromDB<Repository>("repository"),
          ]);
        setCurrentUserId(user?.id ?? null);

        const clients = clientRows.map(mapClientRowToRecord);
        const clientByExternalId = buildClientIdLookup(clients);
        clientIdLookupRef.current = clientByExternalId;

        const repoByRunId = new Map<string, string>();
        for (const repo of repositories) {
          const key = normalizeRunId(repo.run_id);
          const url = repo.url?.trim();
          if (key && url && !repoByRunId.has(key)) {
            repoByRunId.set(key, url);
          }
        }
        setRunIdRepoLinks(repoByRunId);

        const serviceMap = new Map<string, { name: string; category: ServiceCategory }>();
        for (const s of services as Service[]) {
          serviceMap.set(s.id, { name: s.name, category: s.category });
        }

        const tmpProjectMap = new Map<
          string,
          { name: string; client: string; service_name: string | null; service_category: ServiceCategory | null }
        >();
        for (const p of projects) {
          const client = clients.find((c) => c.id === p.client_id);
          const service = p.service_id ? serviceMap.get(p.service_id) : undefined;
          tmpProjectMap.set(p.id, {
            name: p.name,
            client: client?.clientName ?? "—",
            service_name: service?.name ?? null,
            service_category: service?.category ?? null,
          });
        }

        const tmpUserMap = new Map<string, string>();
        for (const u of users as User[]) {
          tmpUserMap.set(u.id, u.name);
        }

        const rows: ServiceProjectRow[] = analyses.map((a) => {
          const proj = a.project_id ? tmpProjectMap.get(a.project_id) : undefined;
          const assigneeName = a.assignee_id
            ? (tmpUserMap.get(a.assignee_id) ?? "Unassigned")
            : "Unassigned";
          const clientMatch = matchClientByExternalId(
            a.external_client_id,
            clientByExternalId,
          );
          return analysisToRow(a, {
            projectName: proj?.name,
            clientFromProject: proj?.client,
            serviceName: proj?.service_name,
            serviceCategory: proj?.service_category,
            assigneeName,
            clientMatch,
          });
        });

        setServicesList(rows);
        setAvailableProjects(
          Array.from(tmpProjectMap.entries()).map(([id, v]) => ({ id, ...v })),
        );
        setAvailableAssignees(
          (users as User[])
            .filter(
              (u) => u.role === "team_lead" || u.role === "team_member",
            )
            .map((u) => u.name),
        );
        setAvailableReviewers(
          (users as User[])
            .filter(
              (u) =>
                u.role === "reviewing_officer" ||
                u.role === "team_lead" ||
                u.role === "team_member",
            )
            .map((u) => ({ id: u.id, name: u.name })),
        );
        setAvailableApprovers(
          (users as User[])
            .filter(
              (u) =>
                u.role === "approving_officer" || u.role === "team_lead",
            )
            .map((u) => ({ id: u.id, name: u.name })),
        );
      } catch (err) {
        console.error("Error loading services data:", err);
        setLoadError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (filterContainerRef.current) {
      const container = filterContainerRef.current;
      const activeButton = container.querySelector(
        `[data-filter="${activeFilter}"]`,
      ) as HTMLButtonElement;

      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const relativeLeft =
          buttonRect.left - containerRect.left + container.scrollLeft;

        setSlideStyle({
          left: relativeLeft,
          width: buttonRect.width,
        });
      }
    }
  }, [activeFilter]);

  const handleTrackerStatusChange = async (
    id: string,
    field: "status_of_completion" | "status_of_submission",
    label: string,
  ) => {
    const row = servicesList.find((s) => s.id === id);
    if (!row) return;

    const nextCompletion =
      field === "status_of_completion" ? label : row.status_of_completion;
    const nextSubmission =
      field === "status_of_submission" ? label : row.status_of_submission;
    const legacyStatus = deriveLegacyStatus({
      status_of_completion: nextCompletion,
      status_of_submission: nextSubmission,
    });
    const completedAt =
      legacyStatus === "completed" ? new Date().toISOString() : null;

    try {
      const updated = await saveDataToDB("analysis", id, {
        [field]: label || null,
        status: legacyStatus,
        completed_at: completedAt,
      });
      setServicesList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: label,
                status: updated.status as AnalysisStatus,
                completed: updated.completed_at
                  ? (updated.completed_at.split("T")[0] ?? "—")
                  : "—",
              }
            : item,
        ),
      );
      const syncResult = await syncAnalysisToTaskSafe({
        id: updated.id,
        project_id: updated.project_id,
        pipeline: updated.pipeline,
        pipeline_version: updated.pipeline_version,
        status: updated.status as AnalysisStatus,
        assignee_id: updated.assignee_id,
        started_at: updated.started_at,
        completed_at: updated.completed_at,
        projectName: row.project_name,
        serviceReportNumber: updated.service_report_number,
        application: updated.application,
        statusOfCompletion: updated.status_of_completion,
      });
      if (syncResult === "created") {
        showToast("Status updated. Added to Tasks as Sequence Analysis.", "success");
      } else if (syncResult === "deleted") {
        showToast("Status updated. Removed from the task list.", "success");
      } else if (syncResult === "skipped_no_assignee") {
        showToast(
          "Status updated. Assign someone to add this to the task list.",
          "success",
        );
      } else if (syncResult === "error") {
        showToast(
          "Status updated, but the linked task could not be synced.",
          "error",
        );
      } else {
        showToast("Status updated.", "success");
      }
    } catch {
      showToast("Failed to update status.", "error");
    }
  };

  const handleInputChange = useCallback(
    (key: keyof AnalysisFormState, value: string | number | string[] | boolean) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setIsEditing(false);
    setSelectedAnalysis(null);
    setPendingFile(null);
    setFormState(EMPTY_ANALYSIS_FORM);
  }, []);

  const openCreateSidebar = useCallback(() => {
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);
    setIsEditing(false);
    setSelectedAnalysis(null);
    setPendingFile(null);
    setFormState({
      ...EMPTY_ANALYSIS_FORM,
      service_report_number: nextServiceReportNumber(
        servicesList.map((s) => s.service_report_number),
        today,
      ),
      service_report_date: dateKey,
      // New analyses start on-going so they land on Tasks straight away.
      status_of_completion: "On-going",
    });
    setIsSidebarOpen(true);
  }, [servicesList]);

  const openEditSidebar = useCallback((row: ServiceProjectRow) => {
    setSelectedAnalysis(row);
    setIsEditing(true);
    setPendingFile(null);
    setFormState(rowToFormState(row));
    setIsSidebarOpen(true);
  }, []);

  const handleSaveAnalysis = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        let assigneeId: string | null = null;
        if (formState.assignee.trim()) {
          const matchedUser = availableReviewers.find(
            (u) => u.name === formState.assignee,
          );
          if (!matchedUser) {
            showToast("Assignee not found.", "error");
            return;
          }
          assigneeId = matchedUser.id;
        }

        const reviewerId = emptyToNull(formState.reviewer_user_id);
        const approverId = emptyToNull(formState.approver_user_id);

        if (reviewerId && assigneeId && reviewerId === assigneeId) {
          showToast(
            "Reviewing officer cannot be the same person as the assignee.",
            "error",
          );
          return;
        }
        if (reviewerId && approverId && reviewerId === approverId) {
          showToast(
            "Reviewing and approving officers must be different people.",
            "error",
          );
          return;
        }

        const legacyStatus = deriveLegacyStatus({
          status_of_completion: formState.status_of_completion,
          status_of_submission: formState.status_of_submission,
        });
        const nowIso = new Date().toISOString();
        const completedAt = legacyStatus === "completed" ? nowIso : null;

        const targetId =
          isEditing && selectedAnalysis
            ? selectedAnalysis.id
            : crypto.randomUUID();

        const previousPath =
          isEditing && selectedAnalysis
            ? selectedAnalysis.service_report_file_path.trim()
            : "";
        const pathCleared =
          Boolean(previousPath) && !formState.service_report_file_path.trim();

        let fileMeta: ServiceReportFileMeta | null = null;
        if (pendingFile) {
          fileMeta = await uploadServiceReportPdf({
            analysisId: targetId,
            file: pendingFile,
            uploadedBy: currentUserId,
          });
        }

        const payload: Record<string, unknown> = {
          project_id: emptyToNull(formState.project_id),
          pipeline: emptyToNull(formState.pipeline),
          pipeline_version: null,
          assignee_id: assigneeId,
          status: legacyStatus,
          completed_at: completedAt,
          service_report_number: emptyToNull(formState.service_report_number),
          service_report_date: emptyToNull(formState.service_report_date),
          application: emptyToNull(formState.application),
          client_name: emptyToNull(formState.client_name),
          client_type: emptyToNull(formState.client_type),
          external_client_id: emptyToNull(formState.external_client_id),
          external_project_id: emptyToNull(formState.external_project_id),
          sample_type: emptyToNull(formState.sample_type),
          run_id: emptyToNull(formState.run_id),
          status_of_completion: emptyToNull(formState.status_of_completion),
          status_of_submission: emptyToNull(formState.status_of_submission),
          service_report_link: emptyToNull(formState.service_report_link),
          client_sequences_link: emptyToNull(formState.client_sequences_link),
          notes: emptyToNull(formState.notes),
          reviewer_user_id: reviewerId,
          approver_user_id: approverId,
          ...(isEditing ? {} : { started_at: nowIso }),
        };

        if (fileMeta) {
          Object.assign(payload, fileMeta);
        } else if (pathCleared) {
          payload.service_report_file_path = null;
          payload.service_report_file_name = null;
          payload.service_report_file_size = null;
          payload.service_report_uploaded_at = null;
          payload.service_report_uploaded_by = null;
        }

        const saved = await saveDataToDB("analysis", targetId, payload);

        if (fileMeta && previousPath && previousPath !== fileMeta.service_report_file_path) {
          await deleteServiceReportPdf(previousPath);
        } else if (pathCleared && previousPath) {
          await deleteServiceReportPdf(previousPath);
        }

        const targetProject = availableProjects.find((p) => p.id === formState.project_id);

        const syncResult = await syncAnalysisToTaskSafe({
          id: saved.id,
          project_id: saved.project_id,
          pipeline: saved.pipeline,
          pipeline_version: saved.pipeline_version,
          status: saved.status as AnalysisStatus,
          assignee_id: saved.assignee_id,
          started_at: saved.started_at,
          completed_at: saved.completed_at,
          projectName: targetProject?.name ?? saved.client_name,
          serviceReportNumber: saved.service_report_number,
          application: saved.application,
          statusOfCompletion: saved.status_of_completion,
        });

        const row = analysisToRow(saved as Analysis, {
          projectName: targetProject?.name,
          clientFromProject: targetProject?.client,
          serviceName: targetProject?.service_name,
          serviceCategory: targetProject?.service_category,
          assigneeName: formState.assignee || "Unassigned",
          clientMatch: matchClientByExternalId(
            saved.external_client_id,
            clientIdLookupRef.current,
          ),
        });

        if (isEditing) {
          setServicesList((prev) =>
            prev.map((item) => (item.id === row.id ? row : item)),
          );
        } else {
          setServicesList((prev) => [row, ...prev]);
        }

        if (syncResult === "created") {
          showToast(
            isEditing
              ? "Analysis updated and added to Tasks as Sequence Analysis."
              : "Analysis created and added to Tasks as Sequence Analysis.",
            "success",
          );
        } else if (syncResult === "deleted") {
          showToast("Analysis cancelled. Removed from the task list.", "success");
        } else if (syncResult === "skipped_no_assignee") {
          showToast(
            isEditing
              ? "Analysis updated. Assign someone to add this to the task list."
              : "Analysis created. Assign someone to add this to the task list.",
            "success",
          );
        } else if (syncResult === "error") {
          showToast(
            isEditing
              ? "Analysis updated, but the linked task could not be synced."
              : "Analysis created, but the linked task could not be synced.",
            "error",
          );
        } else {
          showToast(
            isEditing
              ? "Analysis updated successfully."
              : "Analysis created successfully.",
            "success",
          );
        }
        closeSidebar();
      } catch (err) {
        console.error(err);
        showToast(
          err instanceof Error
            ? err.message
            : isEditing
              ? "Failed to update analysis."
              : "Failed to create analysis.",
          "error",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formState,
      availableProjects,
      availableReviewers,
      pendingFile,
      currentUserId,
      showToast,
      isSubmitting,
      isEditing,
      selectedAnalysis,
      closeSidebar,
    ],
  );

  const handleDeleteAnalysis = useCallback(async () => {
    if (!selectedAnalysis) return;
    setIsDeleting(true);
    try {
      const analysisId = selectedAnalysis.id;

      // Clear dependent rows first (no ON DELETE CASCADE on these FKs).
      const { data: linkedTasks } = await supabase
        .from("task")
        .select("id")
        .eq("linked_analysis_id", analysisId);
      const taskIds = (linkedTasks ?? []).map((t) => t.id as string);
      if (taskIds.length > 0) {
        await supabase.from("task_tag").delete().in("task_id", taskIds);
        await supabase.from("task").delete().in("id", taskIds);
      }
      await supabase.from("service_report").delete().eq("analysis_id", analysisId);
      await deleteDataFromDB("analysis", analysisId);
      await deleteAllServiceReportPdfs(analysisId);

      setServicesList((prev) => prev.filter((item) => item.id !== analysisId));
      setShowDeleteConfirm(false);
      setSelectedAnalysis(null);
      showToast("Analysis deleted.", "success");
    } catch (err) {
      console.error("Failed to delete analysis:", err);
      showToast("Failed to delete analysis.", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedAnalysis, showToast]);

  const handleReportUploaded = useCallback(
    (analysisId: string, result: ServiceReportUploadResult) => {
      setServicesList((prev) =>
        prev.map((item) => {
          if (item.id !== analysisId) return item;
          return {
            ...item,
            report_link: result.link || item.report_link,
            service_report_file_path:
              result.file?.service_report_file_path ?? item.service_report_file_path,
            service_report_file_name:
              result.file?.service_report_file_name ?? item.service_report_file_name,
            service_report_file_size:
              result.file?.service_report_file_size ?? item.service_report_file_size,
          };
        }),
      );

      const payload: Record<string, unknown> = {};
      if (result.link) payload.service_report_link = result.link;
      if (result.file) Object.assign(payload, result.file);

      if (Object.keys(payload).length === 0) return;

      void saveDataToDB("analysis", analysisId, payload).catch((err) =>
        console.error("Failed to save report on analysis:", err),
      );
    },
    [],
  );

  const availableYears = useMemo(
    () =>
      getAvailableAnalysisYears(
        servicesList.map((row) => ({
          service_report_date: row.service_report_date,
          service_report_number: row.service_report_number,
          started_at: row.started === "—" ? null : row.started,
        })),
      ),
    [servicesList],
  );

  const filteredServices = useMemo(() => {
    let records = servicesList;

    if (yearFilter && yearFilter !== "all") {
      records = records.filter((item) => {
        const year = getAnalysisYear({
          service_report_date: item.service_report_date,
          service_report_number: item.service_report_number,
          started_at: item.started === "—" ? null : item.started,
        });
        return year === yearFilter;
      });
    }

    if (pipelineFilter) {
      const needle = pipelineFilter.toLowerCase();
      records = records.filter(
        (item) =>
          item.analysis_pipeline.toLowerCase() === needle ||
          item.analysis_classification.toLowerCase() === needle ||
          item.application.toLowerCase() === needle,
      );
    }

    if (runIdFilter) {
      const needle = runIdFilter.toLowerCase();
      records = records.filter(
        (item) => item.run_id.trim().toLowerCase() === needle,
      );
    }

    if (activeFilter !== "All") {
      records = records.filter((item) => item.status === activeFilter);
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return records;

    // When a run-ID deep-link filter is active and the search box still holds
    // that same value, skip substring search — exact match already applied.
    if (runIdFilter && query === runIdFilter.toLowerCase()) {
      return records;
    }

    return records.filter(
      (item) =>
        item.service_report_number.toLowerCase().includes(query) ||
        item.project_name.toLowerCase().includes(query) ||
        item.client.toLowerCase().includes(query) ||
        item.analysis_pipeline.toLowerCase().includes(query) ||
        item.analysis_classification.toLowerCase().includes(query) ||
        item.application.toLowerCase().includes(query) ||
        item.external_client_id.toLowerCase().includes(query) ||
        item.external_project_id.toLowerCase().includes(query) ||
        item.sample_type.toLowerCase().includes(query) ||
        item.run_id.toLowerCase().includes(query) ||
        item.assignee.toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query),
    );
  }, [searchQuery, servicesList, activeFilter, yearFilter, pipelineFilter, runIdFilter]);

  const {
    displayed: displayedServices,
    currentPage,
    setCurrentPage,
    sortConfig,
    handleSort,
  } = useTableState<ServiceProjectRow>({
    items: filteredServices,
    itemsPerPage: ITEMS_PER_PAGE,
    resetKey: `${searchQuery}-${activeFilter}-${yearFilter}-${pipelineFilter}-${runIdFilter}`,
    initialSort: { key: "service_report_number", direction: "desc" },
    customSorters: {
      service_report_number: (a, b) => {
        const pa = parseServiceReportNumber(a.service_report_number);
        const pb = parseServiceReportNumber(b.service_report_number);
        if (pa && pb) {
          if (pa.sequence !== pb.sequence) return pa.sequence - pb.sequence;
          return pa.year - pb.year;
        }
        if (pa && !pb) return 1;
        if (!pa && pb) return -1;
        return a.service_report_number
          .toLowerCase()
          .localeCompare(b.service_report_number.toLowerCase());
      },
    },
  });

  const statusChipColors = (value: string) => {
    const key = value.toLowerCase();
    let colorClasses = "bg-gray-100 text-gray-700 border-gray-200";
    let chevronClass = "text-gray-500";

    if (key === "completed") {
      colorClasses = "bg-[#eaf7ee] text-[#2e7d32] border-[#2e7d32]/25";
      chevronClass = "text-[#2e7d32]";
    } else if (key === "ongoing" || key === "on-going" || key === "on going") {
      colorClasses = "bg-[#fff8e1] text-[#f57f17] border-[#f57f17]/25";
      chevronClass = "text-[#f57f17]";
    } else if (key === "for_approval" || key === "for approval") {
      colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
      chevronClass = "text-blue-700";
    } else if (key === "for review" || key === "for_review") {
      colorClasses = "bg-sky-50 text-sky-800 border-sky-200";
      chevronClass = "text-sky-700";
    } else if (key === "in review" || key === "in_review") {
      colorClasses = "bg-indigo-50 text-indigo-800 border-indigo-200";
      chevronClass = "text-indigo-700";
    } else if (key === "revision requested" || key === "revision_requested") {
      colorClasses = "bg-orange-50 text-orange-800 border-orange-300";
      chevronClass = "text-orange-700";
    } else if (key === "reviewed") {
      colorClasses = "bg-teal-50 text-teal-800 border-teal-200";
      chevronClass = "text-teal-700";
    } else if (key === "under review" || key === "under_review") {
      colorClasses = "bg-amber-50 text-amber-800 border-amber-200";
      chevronClass = "text-amber-700";
    } else if (key === "changes requested" || key === "changes_requested") {
      colorClasses = "bg-orange-50 text-orange-800 border-orange-300";
      chevronClass = "text-orange-700";
    } else if (key === "approved") {
      colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
      chevronClass = "text-emerald-700";
    } else if (key.includes("on hold") || key === "on_hold") {
      colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
      chevronClass = "text-slate-500";
    } else if (key === "submitted") {
      colorClasses = "bg-[#f3e8ff] text-[#6b21a8] border-[#6b21a8]/20";
      chevronClass = "text-[#6b21a8]";
    } else if (key === "cancelled" || key === "canceled") {
      colorClasses = "bg-rose-50 text-rose-700 border-rose-200";
      chevronClass = "text-rose-600";
    }

    return { colorClasses, chevronClass };
  };

  const renderTrackerStatusDropdown = (
    id: string,
    field: "status_of_completion" | "status_of_submission",
    currentLabel: string,
    options: readonly string[],
    ariaLabel: string,
  ) => {
    const value = currentLabel.trim();
    const optionSet = new Set(options);
    const { colorClasses, chevronClass } = statusChipColors(value || "blank");

    return (
      <div className="relative inline-flex items-center max-w-full">
        <select
          value={value}
          onChange={(e) => handleTrackerStatusChange(id, field, e.target.value)}
          aria-label={ariaLabel}
          className={`pl-2.5 pr-6 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-[#4ec2bb]/30 appearance-none whitespace-nowrap max-w-full transition-all ${colorClasses}`}
        >
          <option value="" className="bg-white text-slate-800 normal-case text-xs">
            —
          </option>
          {options.map((opt) => (
            <option
              key={opt}
              value={opt}
              className="bg-white text-slate-800 normal-case text-xs"
            >
              {opt}
            </option>
          ))}
          {value && !optionSet.has(value) ? (
            <option value={value} className="bg-white text-slate-800 normal-case text-xs">
              {value}
            </option>
          ) : null}
        </select>
        <ChevronDown
          className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${chevronClass}`}
        />
      </div>
    );
  };

  const renderLinkCell = (url: string, label = "Open") => {
    if (!url) return <span className="text-slate-400">—</span>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 max-w-full min-w-0 text-[#2a7797] hover:text-[#4ec2bb] font-semibold underline decoration-dotted"
      >
        <ExternalLink className="w-3 h-3 shrink-0" />
        <TruncatedText text={url} display={label} force className="text-[#2a7797]" />
      </a>
    );
  };

  const columns: Column<ServiceProjectRow>[] = [
    {
      key: "service_report_number",
      label: "Service Report Number",
      shortLabel: "SR Number",
      width: "11%",
      sortable: true,
      render: (s) => (
        <Link
          href={`/dashboard/services/${s.id}`}
          className="block min-w-0 font-bold text-[#2a7797] hover:text-[#4ec2bb] transition-colors"
        >
          <TruncatedText
            text={s.service_report_number || s.project_name}
            display={dash(s.service_report_number)}
            className="font-bold text-[#2a7797]"
          />
        </Link>
      ),
    },
    {
      key: "service_report_date",
      label: "Date (Service Report)",
      shortLabel: "Date",
      width: "6%",
      sortable: true,
      render: (s) => <TruncatedText text={dash(s.service_report_date)} />,
    },
    {
      key: "analysis_classification",
      label: "Analysis Classification",
      shortLabel: "Classification",
      width: "8%",
      sortable: true,
      render: (s) => (
        <TruncatedText
          text={s.analysis_pipeline || s.analysis_classification}
          display={dash(s.analysis_classification)}
        />
      ),
    },
    {
      key: "client",
      label: "Client",
      width: "8%",
      sortable: true,
      render: (s) => <TruncatedText text={dash(s.client)} />,
    },
    {
      key: "client_type",
      label: "Client Type",
      shortLabel: "Type",
      width: "5%",
      sortable: true,
      render: (s) => <TruncatedText text={dash(s.client_type)} />,
    },
    {
      key: "external_client_id",
      label: "Client ID",
      width: "6%",
      sortable: true,
      render: (s) => {
        const id = s.external_client_id.trim();
        if (!id) return "—";

        if (s.client_match === "matched") {
          return (
            <Link
              href={routes.clients.byQuery(id)}
              onClick={(e) => e.stopPropagation()}
              className="block min-w-0 font-mono text-[11px] text-[#1b5e20] hover:underline"
            >
              <TruncatedText
                text={
                  s.matched_client_name
                    ? `${id} · Linked to ${s.matched_client_name}`
                    : id
                }
                display={id}
                className="font-mono text-[11px] text-[#1b5e20]"
              />
            </Link>
          );
        }

        return (
          <TruncatedText
            text={`${id} · No matching client in Clients module`}
            display={id}
            className="font-mono text-[11px] text-amber-800/80"
          />
        );
      },
    },
    {
      key: "external_project_id",
      label: "Project ID",
      width: "6%",
      sortable: true,
      render: (s) => (
        <TruncatedText
          text={dash(s.external_project_id)}
          className="font-mono text-[11px]"
        />
      ),
    },
    {
      key: "sample_type",
      label: "Sample Type",
      shortLabel: "Sample",
      width: "6%",
      sortable: true,
      render: (s) => <TruncatedText text={dash(s.sample_type)} />,
    },
    {
      key: "run_id",
      label: "RUN ID",
      width: "6%",
      sortable: true,
      render: (s) => {
        if (!s.run_id) {
          return <span className="font-mono text-[11px]">—</span>;
        }
        const repoUrl = runIdRepoLinks.get(normalizeRunId(s.run_id));
        if (repoUrl) {
          return (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 max-w-full min-w-0 font-mono text-[11px] text-[#2a7797] hover:text-[#1f5c76] font-semibold underline decoration-dotted"
            >
              <TruncatedText
                text={repoUrl}
                display={s.run_id}
                force
                className="font-mono text-[11px] text-[#2a7797]"
              />
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          );
        }
        return (
          <TruncatedText
            text={s.run_id}
            className="font-mono text-[11px]"
          />
        );
      },
    },
    {
      key: "status_of_completion",
      label: "Status of Completion",
      shortLabel: "Completion Status",
      width: "7%",
      sortable: true,
      render: (s) =>
        renderTrackerStatusDropdown(
          s.id,
          "status_of_completion",
          s.status_of_completion || labelFromAnalysisStatus(s.status),
          STATUS_OF_COMPLETION_OPTIONS,
          "Status of Completion",
        ),
    },
    {
      key: "status_of_review",
      label: "Status of Review",
      shortLabel: "Review Status",
      width: "7%",
      sortable: true,
      render: (s) => {
        const value = (s.status_of_review || "").trim();
        const { colorClasses } = statusChipColors(value || "blank");
        return (
          <span
            className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${colorClasses}`}
          >
            {value || "—"}
          </span>
        );
      },
    },
    {
      key: "status_of_submission",
      label: "Status of Submission",
      shortLabel: "Submission Status",
      width: "7%",
      sortable: true,
      render: (s) =>
        renderTrackerStatusDropdown(
          s.id,
          "status_of_submission",
          s.status_of_submission,
          MANUAL_STATUS_OF_SUBMISSION_OPTIONS,
          "Status of Submission",
        ),
    },
    {
      key: "review_comments",
      label: "Review Comments",
      shortLabel: "Comments",
      width: "6%",
      render: (s) => {
        const awaiting =
          isRevisionRequestedLabel(s.status_of_review) ||
          isChangesRequestedLabel(s.status_of_submission);
        return (
          <button
            type="button"
            onClick={() => setCommentsRow(s)}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
              awaiting
                ? "text-amber-800 hover:text-amber-950"
                : "text-[#2a7797] hover:text-[#1f5c76]"
            }`}
            title={
              awaiting
                ? "View comments and respond"
                : "View review comments"
            }
          >
            <MessageSquareWarning className="w-3 h-3 shrink-0" />
            {awaiting ? "Respond" : "View"}
          </button>
        );
      },
    },
    {
      key: "report_link",
      label: "Service Report",
      shortLabel: "Report",
      width: "6%",
      render: (s) => {
        const hasPdf = Boolean(s.service_report_file_path?.trim());
        const hasLink = Boolean(s.report_link?.trim());
        if (hasPdf) {
          return (
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const url = await getServiceReportSignedUrl(
                    s.service_report_file_path,
                    s.service_report_file_name,
                  );
                  if (url) {
                    window.open(url, "_blank", "noopener,noreferrer");
                  } else {
                    showToast("Couldn't open that PDF.", "error");
                  }
                })();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2a7797] hover:text-[#1f5c76]"
            >
              <FileText className="w-3 h-3" />
              <TruncatedText
                text={s.service_report_file_name || "PDF"}
                display="PDF"
                force
                className="text-[#2a7797]"
              />
            </button>
          );
        }
        if (hasLink) {
          return renderLinkCell(s.report_link, "Link");
        }
        if (s.status === "completed") {
          return (
            <button
              type="button"
              onClick={() => setSelectedReportRow(s)}
              className="inline-flex items-center gap-1 text-[11px] text-[#2a7797] hover:text-[#1f5c76] font-semibold"
            >
              <FileText className="w-3 h-3" /> Upload
            </button>
          );
        }
        return <span className="text-slate-400">—</span>;
      },
    },
    {
      key: "client_sequences_link",
      label: "Client Sequences Link",
      shortLabel: "Sequences",
      width: "5%",
      render: (s) => renderLinkCell(s.client_sequences_link, "Sequences"),
    },
    {
      key: "notes",
      label: "Notes/Remarks",
      shortLabel: "Notes",
      width: "6%",
      sortable: true,
      render: (s) => (
        <TruncatedText
          text={s.notes}
          display={dash(s.notes)}
          multiline
          force={Boolean(s.notes?.trim())}
        />
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "5%",
      render: (s) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => openEditSidebar(s)}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all duration-200 shadow-sm"
            title="Edit analysis"
          >
            <Edit3 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-105" />
            <ChevronRight className="w-3 h-3 opacity-0 max-w-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] group-hover/btn:translate-x-0 transition-all duration-200 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedAnalysis(s);
              setShowDeleteConfirm(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-all duration-200 shadow-sm"
            title="Delete analysis"
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
      className={`space-y-8 mx-auto font-aileron w-full transition-all duration-300 ease-in-out ${
        isSidebarOpen ? "xl:pr-[448px]" : "max-w-full"
      }`}
    >
      <PageHeader
        breadcrumbTrail={servicesBreadcrumbs}
        title="Service Report Tracker"
        subtitle="Bioinformatics Services · Client sequence analysis records, status, and reporting links"
        actions={
          <>
            <div className="relative">
              <select
                aria-label="Filter by year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="h-10 pl-3 pr-8 bg-surface rounded-full border border-gray-200 text-xs font-bold text-[#174e64] outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm appearance-none cursor-pointer"
              >
                <option value="all">All years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            {pipelineFilter ? (
              <button
                type="button"
                onClick={() => setPipelineFilter("")}
                className="h-10 px-3 rounded-full border border-[#2a7797]/30 bg-[#e6f4f8] text-[11px] font-bold text-[#2a7797] hover:bg-[#d5eff6] transition-colors"
                title="Clear analysis type filter"
              >
                Type: {pipelineFilter} ×
              </button>
            ) : null}
            {runIdFilter ? (
              <button
                type="button"
                onClick={() => {
                  setRunIdFilter("");
                  setSearchQuery("");
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("run_id");
                  const qs = params.toString();
                  router.replace(
                    qs ? `${routes.services.tracker}?${qs}` : routes.services.tracker,
                  );
                }}
                className="h-10 px-3 rounded-full border border-[#92298d]/30 bg-[#f8eef7] text-[11px] font-bold text-[#92298d] hover:bg-[#f1e0ef] transition-colors font-mono"
                title="Clear run ID filter"
              >
                Run ID: {runIdFilter} ×
              </button>
            ) : null}
            <div className="relative w-full min-[480px]:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search analysis..."
                aria-label="Search services"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-surface rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
              />
            </div>
            <button
              type="button"
              onClick={openCreateSidebar}
              className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Analysis
            </button>
          </>
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">Service Report Tracker</h2>
            <ServiceReportWorkflowInfoButton />
          </div>

          <div
            ref={filterContainerRef}
            className="relative flex items-center bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full w-fit overflow-hidden shadow-inner"
          >
            <div
              className="absolute top-1 bottom-1 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100/80 transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${slideStyle.left}px`,
                width: `${slideStyle.width}px`,
              }}
            />
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  data-filter={opt.value}
                  type="button"
                  onClick={() => setActiveFilter(opt.value)}
                  className={`relative z-10 px-4 py-1.5 rounded-full text-xs text-center transition-colors duration-300 select-none whitespace-nowrap ${
                    isActive
                      ? "text-[#2a7797] font-semibold"
                      : "text-slate-500 hover:text-slate-800 font-medium"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {loadError ? (
          <ErrorState message={loadError} />
        ) : isLoading ? (
          <LoadingState variant="skeleton" message="Loading services…" />
        ) : servicesList.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No services yet"
            description="Create your first analysis to get started."
          />
        ) : filteredServices.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No matching services"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="w-full space-y-4 overflow-x-auto [&&_table]:min-w-[2400px] [&&_table]:table-fixed">
            <DataTable
              columns={columns}
              data={displayedServices}
              sortConfig={sortConfig}
              onSort={handleSort}
              emptyMessage="No matching service report records."
            />
            <Pagination
              totalItems={filteredServices.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <ServiceReportModal
        isOpen={!!selectedReportRow}
        analysis={selectedReportRow}
        currentUserId={currentUserId}
        onClose={() => setSelectedReportRow(null)}
        onReportUploaded={handleReportUploaded}
      />

      <ReviewCommentsModal
        row={
          commentsRow
            ? {
                id: commentsRow.id,
                label:
                  commentsRow.service_report_number ||
                  commentsRow.project_name ||
                  "Service report",
                status_of_review: commentsRow.status_of_review,
                status_of_submission: commentsRow.status_of_submission,
                service_report_file_path: commentsRow.service_report_file_path,
                service_report_file_name: commentsRow.service_report_file_name,
              }
            : null
        }
        onClose={() => setCommentsRow(null)}
        onResubmitted={(stage) => {
          setServicesList((prev) =>
            prev.map((row) =>
              row.id === commentsRow?.id
                ? {
                    ...row,
                    ...(stage === "review"
                      ? { status_of_review: "For review" }
                      : { status_of_submission: "For approval" }),
                  }
                : row,
            ),
          );
          setCommentsRow((prev) =>
            prev
              ? {
                  ...prev,
                  ...(stage === "review"
                    ? { status_of_review: "For review" }
                    : { status_of_submission: "For approval" }),
                }
              : prev,
          );
        }}
        onPdfReplaced={({ path, name }) => {
          setServicesList((prev) =>
            prev.map((row) =>
              row.id === commentsRow?.id
                ? {
                    ...row,
                    service_report_file_path: path,
                    service_report_file_name: name,
                  }
                : row,
            ),
          );
          setCommentsRow((prev) =>
            prev
              ? {
                  ...prev,
                  service_report_file_path: path,
                  service_report_file_name: name,
                }
              : prev,
          );
        }}
      />

      <AnalysisSidebar
        isOpen={isSidebarOpen}
        isSaving={isSubmitting}
        isEditing={isEditing}
        formState={formState}
        availableProjects={availableProjects}
        availableAssignees={availableAssignees}
        availableReviewers={availableReviewers}
        availableApprovers={availableApprovers}
        pendingFile={pendingFile}
        onPendingFileChange={setPendingFile}
        onClose={closeSidebar}
        onChange={handleInputChange}
        onSubmit={handleSaveAnalysis}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={
          selectedAnalysis?.service_report_number ||
          selectedAnalysis?.project_name ||
          "this analysis"
        }
        onClose={() => {
          setShowDeleteConfirm(false);
          if (!isSidebarOpen) setSelectedAnalysis(null);
        }}
        onConfirm={handleDeleteAnalysis}
        isDeleting={isDeleting}
      />
    </div>
  );
}
