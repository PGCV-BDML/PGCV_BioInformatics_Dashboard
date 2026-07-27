"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import Link from "next/link";

import Pagination from "../../components/pagination";
import AnalysisSidebar, {
  AnalysisFormState,
  EMPTY_ANALYSIS_FORM,
} from "../../components/analysismodal";
import ServiceReportModal from "../../components/service-report-modal";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import {
  Search,
  Dna,
  FileText,
  ChevronDown,
  Plus,
  Inbox,
} from "lucide-react";
import {
  getCurrentUser,
  getRowsFromDB,
  getNameIdFromDB,
  getUsersFromDB,
  saveDataToDB,
} from "@/lib/supabase";
import { syncAnalysisToTaskSafe } from "@/lib/sync-analysis-task";
import {
  deriveLegacyStatus,
  displayAnalysisLabel,
  labelFromAnalysisStatus,
} from "@/lib/analysis-tracker";
import {
  Analysis,
  AnalysisStatus,
  ANALYSIS_STATUS_OPTIONS,
  Project,
  User,
  Service,
  ServiceCategory,
} from "../../../types/database";
import { servicesBreadcrumbs } from "@/lib/breadcrumbs";
import { useToast } from "../../components/toast";

interface ServiceProjectRow {
  id: string;
  service_report_number: string;
  project_name: string;
  client: string;
  service_name: string | null;
  service_category: ServiceCategory | null;
  analysis_pipeline: string;
  status: AnalysisStatus;
  status_of_completion: string;
  status_of_submission: string;
  assignee: string;
  started: string;
  completed: string;
  report_link: string;
  run_id: string;
  delivered_by?: string;
  delivered_at?: string;
  client_acknowledged_at?: string;
}

const FILTER_OPTIONS = [
  { value: "All", label: "All Records" },
  ...ANALYSIS_STATUS_OPTIONS,
];

const ITEMS_PER_PAGE = 10;

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

export default function ServicesPage() {
  const [servicesList, setServicesList] = useState<ServiceProjectRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<
    { id: string; name: string; client: string; service_name: string | null; service_category: ServiceCategory | null }[]
  >([]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [formState, setFormState] = useState<AnalysisFormState>(EMPTY_ANALYSIS_FORM);

  const [selectedReportRow, setSelectedReportRow] =
    useState<ServiceProjectRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [slideStyle, setSlideStyle] = useState({ left: 0, width: 0 });

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();

  useEffect(() => {
    toggleSidebar(isSidebarOpen);
  }, [isSidebarOpen, toggleSidebar]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [analyses, projects, clients, services, users, user] = await Promise.all([
          getRowsFromDB<Analysis>("analysis"),
          getRowsFromDB<Project>("project"),
          getNameIdFromDB("client"),
          getRowsFromDB<Service>("service"),
          getUsersFromDB(["team_lead", "team_member", "intern", "trainee"]),
          getCurrentUser(),
        ]);
        setCurrentUserId(user?.id ?? null);

        const serviceMap = new Map<string, { name: string; category: ServiceCategory }>();
        for (const s of services as Service[]) {
          serviceMap.set(s.id, { name: s.name, category: s.category });
        }

        const tmpProjectMap = new Map<
          string,
          { name: string; client: string; service_name: string | null; service_category: ServiceCategory | null }
        >();
        for (const p of projects) {
          const client = (clients as { id: string; name: string }[]).find((c) => c.id === p.client_id);
          const service = p.service_id ? serviceMap.get(p.service_id) : undefined;
          tmpProjectMap.set(p.id, {
            name: p.name,
            client: client?.name ?? "—",
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
          return {
            id: a.id,
            service_report_number: a.service_report_number ?? "",
            project_name:
              a.service_report_number ||
              a.external_project_id ||
              proj?.name ||
              "Untitled analysis",
            client: a.client_name || proj?.client || "—",
            service_name: proj?.service_name ?? null,
            service_category: proj?.service_category ?? null,
            analysis_pipeline: displayAnalysisLabel(a.pipeline, a.application),
            status: a.status as AnalysisStatus,
            status_of_completion: a.status_of_completion ?? "",
            status_of_submission: a.status_of_submission ?? "",
            assignee: assigneeName,
            started: a.service_report_date
              ? a.service_report_date
              : a.started_at
                ? (a.started_at.split("T")[0] ?? "—")
                : "—",
            completed: a.completed_at ? (a.completed_at.split("T")[0] ?? "—") : "—",
            report_link: a.service_report_link ?? "",
            run_id: a.run_id ?? "",
          };
        });

        setServicesList(rows);
        setAvailableProjects(
          Array.from(tmpProjectMap.entries()).map(([id, v]) => ({ id, ...v })),
        );
        setAvailableAssignees(Array.from(tmpUserMap.values()));
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    const status = newStatus as AnalysisStatus;
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const completionLabel = labelFromAnalysisStatus(status);
    try {
      const updated = await saveDataToDB("analysis", id, {
        status,
        status_of_completion: completionLabel,
        completed_at: completedAt,
      });
      setServicesList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: updated.status as AnalysisStatus,
                status_of_completion: updated.status_of_completion ?? completionLabel,
                completed: updated.completed_at
                  ? (updated.completed_at.split("T")[0] ?? "—")
                  : "—",
              }
            : item,
        ),
      );
      const row = servicesList.find((s) => s.id === id);
      await syncAnalysisToTaskSafe({
        id: updated.id,
        project_id: updated.project_id,
        pipeline: updated.pipeline,
        pipeline_version: updated.pipeline_version,
        status: updated.status as AnalysisStatus,
        assignee_id: updated.assignee_id,
        started_at: updated.started_at,
        completed_at: updated.completed_at,
        projectName: row?.project_name,
        serviceReportNumber: updated.service_report_number,
        application: updated.application,
      });
      showToast("Analysis status updated.", "success");
    } catch {
      showToast("Failed to update analysis status.", "error");
    }
  };

  const handleInputChange = useCallback(
    (key: keyof AnalysisFormState, value: string | number | string[] | boolean) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleCreateAnalysis = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        let assigneeId: string | null = null;
        if (formState.assignee.trim()) {
          const users = await getUsersFromDB([
            "team_lead",
            "team_member",
            "intern",
            "trainee",
          ]);
          const matchedUser = (users as User[]).find((u) => u.name === formState.assignee);
          if (!matchedUser) {
            showToast("Assignee not found.", "error");
            return;
          }
          assigneeId = matchedUser.id;
        }

        const legacyStatus = deriveLegacyStatus({
          status_of_completion: formState.status_of_completion,
          status_of_submission: formState.status_of_submission,
          status_of_analysis: formState.status_of_analysis,
        });
        const startedAt = new Date().toISOString();
        const completedAt = legacyStatus === "completed" ? startedAt : null;

        const created = await saveDataToDB("analysis", crypto.randomUUID(), {
          project_id: emptyToNull(formState.project_id),
          pipeline: emptyToNull(formState.pipeline),
          pipeline_version: null,
          assignee_id: assigneeId,
          status: legacyStatus,
          started_at: startedAt,
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
          status_of_analysis: emptyToNull(formState.status_of_analysis),
          status_of_completion: emptyToNull(formState.status_of_completion),
          status_of_submission: emptyToNull(formState.status_of_submission),
          service_report_link: emptyToNull(formState.service_report_link),
          client_sequences_link: emptyToNull(formState.client_sequences_link),
          notes: emptyToNull(formState.notes),
        });

        const targetProject = availableProjects.find((p) => p.id === formState.project_id);
        await syncAnalysisToTaskSafe({
          id: created.id,
          project_id: created.project_id,
          pipeline: created.pipeline,
          pipeline_version: created.pipeline_version,
          status: created.status as AnalysisStatus,
          assignee_id: created.assignee_id,
          started_at: created.started_at,
          completed_at: created.completed_at,
          projectName: targetProject?.name ?? created.client_name,
          serviceReportNumber: created.service_report_number,
          application: created.application,
        });

        const newRow: ServiceProjectRow = {
          id: created.id,
          service_report_number: created.service_report_number ?? "",
          project_name:
            created.service_report_number ||
            created.external_project_id ||
            targetProject?.name ||
            "Untitled analysis",
          client: created.client_name || targetProject?.client || "—",
          service_name: targetProject?.service_name ?? null,
          service_category: targetProject?.service_category ?? null,
          analysis_pipeline: displayAnalysisLabel(created.pipeline, created.application),
          status: created.status as AnalysisStatus,
          status_of_completion: created.status_of_completion ?? "",
          status_of_submission: created.status_of_submission ?? "",
          assignee: formState.assignee || "Unassigned",
          started: created.service_report_date || (startedAt.split("T")[0] ?? ""),
          completed: completedAt ? (completedAt.split("T")[0] ?? "—") : "—",
          report_link: created.service_report_link ?? "",
          run_id: created.run_id ?? "",
        };
        setServicesList((prev) => [newRow, ...prev]);
        setFormState(EMPTY_ANALYSIS_FORM);
        setIsSidebarOpen(false);
        showToast("Analysis created successfully.", "success");
      } catch {
        showToast("Failed to create analysis.", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, availableProjects, showToast, isSubmitting],
  );

  const handleReportGenerated = useCallback(
    (analysisId: string, reportLink: string) => {
      setServicesList((prev) =>
        prev.map((item) =>
          item.id === analysisId ? { ...item, report_link: reportLink } : item,
        ),
      );
      void saveDataToDB("analysis", analysisId, {
        service_report_link: reportLink,
      }).catch((err) => console.error("Failed to save report link on analysis:", err));
    },
    [],
  );

  const filteredServices = useMemo(() => {
    let records = servicesList;

    if (activeFilter !== "All") {
      records = records.filter((item) => item.status === activeFilter);
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return records;

    return records.filter(
      (item) =>
        item.project_name.toLowerCase().includes(query) ||
        item.service_report_number.toLowerCase().includes(query) ||
        item.client.toLowerCase().includes(query) ||
        item.analysis_pipeline.toLowerCase().includes(query) ||
        item.assignee.toLowerCase().includes(query) ||
        item.run_id.toLowerCase().includes(query),
    );
  }, [searchQuery, servicesList, activeFilter]);

  const {
    displayed: displayedServices,
    currentPage,
    setCurrentPage,
  } = useTableState<ServiceProjectRow>({
    items: filteredServices,
    itemsPerPage: ITEMS_PER_PAGE,
    resetKey: `${searchQuery}-${activeFilter}`,
  });

  const renderStatusDropdown = (id: string, currentStatus: string) => {
    let colorClasses = "bg-gray-100 text-gray-700";
    let chevronClass = "text-gray-500";

    if (currentStatus === "completed") {
      colorClasses = "bg-[#eaf7ee] text-[#2e7d32]";
      chevronClass = "text-[#2e7d32]";
    } else if (currentStatus === "ongoing") {
      colorClasses = "bg-[#fffde7] text-[#f57f17]";
      chevronClass = "text-[#f57f17]";
    } else if (currentStatus === "for_approval") {
      colorClasses = "bg-blue-50 text-blue-700";
      chevronClass = "text-blue-700";
    } else if (currentStatus === "on_hold") {
      colorClasses = "bg-slate-100 text-slate-600";
      chevronClass = "text-slate-500";
    } else if (currentStatus === "submitted") {
      colorClasses = "bg-[#f3e8ff] text-[#6b21a8]";
      chevronClass = "text-[#6b21a8]";
    }

    return (
      <div className="relative flex items-center justify-center w-full max-w-[130px]">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(id, e.target.value)}
          className={`pl-3 pr-7 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm cursor-pointer border-0 outline-none focus:outline-none focus:ring-0 text-center appearance-none whitespace-nowrap w-full transition-all ${colorClasses}`}
        >
          {ANALYSIS_STATUS_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-white text-slate-800 normal-case text-xs"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-0.5 pointer-events-none ${chevronClass}`}
        />
      </div>
    );
  };

  const renderReportAction = (s: ServiceProjectRow) => {
    const isCompleted = s.status === "completed";
    return s.report_link ? (
      <a
        href={s.report_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-[#2e7d32] hover:text-[#4ec2bb] font-bold underline decoration-dotted"
      >
        <FileText className="w-3.5 h-3.5" /> View Report
      </a>
    ) : isCompleted ? (
      <button
        type="button"
        onClick={() => setSelectedReportRow(s)}
        className="inline-flex items-center gap-1 text-[11px] bg-[#2a7797] hover:bg-[#1f5c76] text-white px-2.5 py-1 rounded-md font-semibold transition-all shadow-sm"
      >
        Generate Report
      </button>
    ) : (
      <span className="text-xs text-slate-400 italic">Pending</span>
    );
  };

  const getServiceCategoryBadge = (category: ServiceCategory | null) => {
    if (!category) return null;
    const colorMap: Record<ServiceCategory, string> = {
      WGS: "bg-[#2a7797]/10 text-[#2a7797]",
      amplicon: "bg-[#4ec2bb]/10 text-[#4ec2bb]",
      metabarcoding: "bg-[#6bb155]/10 text-[#6bb155]",
      transcriptomics: "bg-[#fcb016]/10 text-[#fcb016]",
      shotgun_metag: "bg-[#92298d]/10 text-[#92298d]",
      phylogenetics: "bg-[#282560]/10 text-[#282560]",
      custom: "bg-slate-100 text-slate-600",
    };
    return (
      <span
        className={`inline-flex items-center text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${colorMap[category]}`}
      >
        {category}
      </span>
    );
  };

  return (
    <div
      className={`space-y-8 mx-auto font-aileron w-full transition-all duration-300 ease-in-out ${
        isSidebarOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      <PageHeader
        breadcrumbTrail={servicesBreadcrumbs}
        title="Bioinformatics Services"
        subtitle="Client sequence analysis · Review active sequences, configurations, and analytical reporting metrics"
        actions={
          <>
            <div className="relative w-full min-[480px]:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-0.5 w-4 h-4 text-gray-400" />
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
              onClick={() => setIsSidebarOpen(true)}
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedServices.map((s) => (
                <div
                  key={s.id}
                  className="bg-surface border border-slate-200/70 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#4ec2bb]/40 transition-all flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/services/${s.id}`}
                        className="font-bold text-[#2a7797] hover:text-[#4ec2bb] transition-all leading-tight"
                      >
                        {s.project_name}
                      </Link>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">{s.client}</p>
                      {getServiceCategoryBadge(s.service_category)}
                    </div>
                    <div className="shrink-0">{renderStatusDropdown(s.id, s.status)}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Analysis
                      </span>
                      <code className="bg-slate-50 text-xs text-slate-600 px-1.5 py-0.5 border border-slate-200 rounded font-mono truncate">
                        {s.analysis_pipeline}
                      </code>
                    </div>
                    {s.status_of_submission ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                          Submission
                        </span>
                        <span className="text-sm text-slate-700 font-medium">
                          {s.status_of_submission}
                        </span>
                      </div>
                    ) : null}
                    {s.run_id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                          RUN ID
                        </span>
                        <span className="text-sm text-slate-700 font-medium">{s.run_id}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Assignee
                      </span>
                      <span className="text-sm text-slate-700 font-medium">{s.assignee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Date
                      </span>
                      <span className="text-sm text-slate-700 font-medium">{s.started}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">{renderReportAction(s)}</div>
                </div>
              ))}
            </div>
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
        onReportGenerated={handleReportGenerated}
      />

      <AnalysisSidebar
        isOpen={isSidebarOpen}
        isSaving={isSubmitting}
        formState={formState}
        availableProjects={availableProjects}
        availableAssignees={availableAssignees}
        onClose={() => setIsSidebarOpen(false)}
        onChange={handleInputChange}
        onSubmit={handleCreateAnalysis}
      />
    </div>
  );
}
