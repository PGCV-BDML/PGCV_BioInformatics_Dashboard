"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTableState } from "@/hooks/useTableState";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import Link from "next/link";

import Pagination from "../../components/pagination";
import AnalysisSidebar, {
  AnalysisFormState,
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
import { Analysis, AnalysisStatus, ANALYSIS_STATUS_OPTIONS, Project, User, Service, ServiceCategory } from "../../../types/database";
import { SERVICES_CONFIG } from "@/lib/services-config";
import { servicesBreadcrumbs } from "@/lib/breadcrumbs";
import { useToast } from "../../components/toast";

interface ServiceProjectRow {
  id: string;
  project_name: string;
  client: string;
  service_name: string | null;
  service_category: ServiceCategory | null;
  analysis_pipeline: string;
  status: "for_approval" | "ongoing" | "on_hold" | "submitted" | "completed";
  assignee: string;
  started: string;
  completed: string;
  report_link: string;
  delivered_by?: string;
  delivered_at?: string;
  client_acknowledged_at?: string;
}

const FILTER_OPTIONS = [
  { value: "All", label: "All Records" },
  ...ANALYSIS_STATUS_OPTIONS,
];



const ITEMS_PER_PAGE = 10;



export default function ServicesPage() {
  const [servicesList, setServicesList] = useState<ServiceProjectRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("sequence-analysis");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string; client: string; service_name: string | null; service_category: ServiceCategory | null }[]>([]);
  const [availablePipelines, setAvailablePipelines] = useState<string[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Sidebar Open State and Form Management
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [formState, setFormState] = useState<AnalysisFormState>({
    project_id: "",
    pipeline: "",
    pipeline_version: "v1.0.0",
    assignee: "",
    status: "for_approval",
  });

  // Report Generator Modal State
  const [selectedReportRow, setSelectedReportRow] =
    useState<ServiceProjectRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs and state for the sliding filter bar mechanism
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

        // Build service map: service_id → {name, category}
        const serviceMap = new Map<string, { name: string; category: ServiceCategory }>();
        for (const s of services as Service[]) {
          serviceMap.set(s.id, { name: s.name, category: s.category });
        }

        // Build a temporary project map for immediate row construction
        // (the hook will rerun on next render with the same data)
        const tmpProjectMap = new Map<string, { name: string; client: string; service_name: string | null; service_category: ServiceCategory | null }>();
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
          const proj = tmpProjectMap.get(a.project_id);
          const assigneeName = tmpUserMap.get(a.assignee_id) ?? "Unassigned";
          const pipeline = `${a.pipeline ?? ""} ${a.pipeline_version ?? ""}`.trim();
          return {
            id: a.id,
            project_name: proj?.name ?? "(unknown project)",
            client: proj?.client ?? "—",
            service_name: proj?.service_name ?? null,
            service_category: proj?.service_category ?? null,
            analysis_pipeline: pipeline || "—",
            status: a.status as ServiceProjectRow["status"],
            assignee: assigneeName,
            started: a.started_at ? a.started_at.split("T")[0] ?? "—" : "—",
            completed: a.completed_at ? a.completed_at.split("T")[0] ?? "—" : "—",
            report_link: "",
          };
        });

        setServicesList(rows);
        setAvailableProjects(
          Array.from(tmpProjectMap.entries()).map(([id, v]) => ({ id, ...v })),
        );
        setAvailablePipelines(
          Array.from(new Set(analyses.map((a) => a.pipeline).filter(Boolean))) as string[],
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

  // Recalculate slider dimensions and offset whenever activeFilter changes
  useEffect(() => {
    if (filterContainerRef.current) {
      const container = filterContainerRef.current;
      const activeButton = container.querySelector(
        `[data-filter="${activeFilter}"]`,
      ) as HTMLButtonElement;

      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        // Calculate position relative to container, accounting for container scroll position
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
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;
    try {
      const updated = await saveDataToDB("analysis", id, {
        status: newStatus,
        completed_at: completedAt,
      });
      setServicesList((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: updated.status as ServiceProjectRow["status"],
                completed: updated.completed_at ? updated.completed_at.split("T")[0] ?? "—" : "—",
              }
            : item,
        ),
      );
      showToast("Analysis status updated.", "success");
    } catch (err) {
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
      if (!currentUserId) {
        console.error("No current user — cannot create analysis");
        return;
      }
      setIsSubmitting(true);
      try {
        // Look up the assignee user id by name (assignees dropdown shows names)
        const users = await getUsersFromDB(["team_lead", "team_member", "intern", "trainee"]);
        const matchedUser = (users as User[]).find((u) => u.name === formState.assignee);
        if (!matchedUser) {
          console.error("Assignee not found:", formState.assignee);
          return;
        }
        const startedAt = new Date().toISOString();
        const completedAt = formState.status === "completed" ? startedAt : null;
        const created = await saveDataToDB("analysis", crypto.randomUUID(), {
          project_id: formState.project_id,
          pipeline: formState.pipeline,
          pipeline_version: formState.pipeline_version,
          assignee_id: matchedUser.id,
          status: formState.status,
          started_at: startedAt,
          completed_at: completedAt,
        });
        // Find the project/client for display
        const targetProject = availableProjects.find((p) => p.id === formState.project_id);
        const newRow: ServiceProjectRow = {
          id: created.id,
          project_name: targetProject?.name ?? "(unknown project)",
          client: targetProject?.client ?? "—",
          service_name: targetProject?.service_name ?? null,
          service_category: targetProject?.service_category ?? null,
          analysis_pipeline: `${formState.pipeline} ${formState.pipeline_version}`.trim() || "—",
          status: created.status as ServiceProjectRow["status"],
          assignee: formState.assignee,
          started: startedAt.split("T")[0] ?? "",
          completed: completedAt ? completedAt.split("T")[0] ?? "—" : "—",
          report_link: "",
        };
        setServicesList((prev) => [newRow, ...prev]);
        setFormState({
          project_id: "",
          pipeline: "",
          pipeline_version: "v1.0.0",
          assignee: "",
          status: "for_approval",
        });
        setIsSidebarOpen(false);
        showToast("Analysis created successfully.", "success");
      } catch (err) {
        showToast("Failed to create analysis.", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUserId, formState, availableProjects, showToast, isSubmitting],
  );

  const handleReportGenerated = useCallback(
    (analysisId: string, reportLink: string) => {
      setServicesList((prev) =>
        prev.map((item) =>
          item.id === analysisId
            ? { ...item, report_link: reportLink }
            : item,
        ),
      );
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
        item.client.toLowerCase().includes(query) ||
        item.analysis_pipeline.toLowerCase().includes(query) ||
        item.assignee.toLowerCase().includes(query),
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
          className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${chevronClass}`}
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
      <span className={`inline-flex items-center text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${colorMap[category]}`}>
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
        subtitle="Operational workflows · Review active sequences, configurations, and analytical reporting metrics"
        actions={
          <>
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
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Analysis
            </button>
          </>
        }
      />

      {/* Navigation Capsule Row */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {SERVICES_CONFIG.map((service) => {
          const isActive = activeTab === service.id;
          return (
            <Link
              key={service.id}
              href={service.href}
              onClick={() => setActiveTab(service.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 ${
                isActive
                  ? "bg-[#2a7797] text-white border-[#2a7797] shadow-md shadow-[#2a7797]/20 font-bold"
                  : "bg-surface text-slate-600 border-slate-300/60 shadow-md shadow-slate-400/10 hover:bg-slate-50/50 hover:text-slate-800"
              }`}
            >
              {service.title}
            </Link>
          );
        })}
      </div>

      {/* Main Table Design Layout */}
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              Service Report Tracker
            </h2>
          </div>

          {/* Animated Filter Bar Capsule */}
          <div
            ref={filterContainerRef}
            className="relative flex items-center bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full w-fit overflow-hidden shadow-inner"
          >
            {/* Sliding Highlight Block */}
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

        {/* Card Grid */}
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
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/services/${s.id}`}
                        className="font-bold text-[#2a7797] hover:text-[#4ec2bb] transition-all leading-tight"
                      >
                        {s.project_name}
                      </Link>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        {s.client}
                      </p>
                      {getServiceCategoryBadge(s.service_category)}
                    </div>
                    <div className="shrink-0">
                      {renderStatusDropdown(s.id, s.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Pipeline
                      </span>
                      <code className="bg-slate-50 text-xs text-slate-600 px-1.5 py-0.5 border border-slate-200 rounded font-mono">
                        {s.analysis_pipeline}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Assignee
                      </span>
                      <span className="text-sm text-slate-700 font-medium">
                        {s.assignee}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Started
                      </span>
                      <span className="text-sm text-slate-700 font-medium">
                        {s.started}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-quicksand min-w-[72px]">
                        Completed
                      </span>
                      <span className="text-sm text-slate-700 font-medium">
                        {s.completed}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100">
                    {renderReportAction(s)}
                  </div>
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

      {/* Service Report Generator Modal */}
      <ServiceReportModal
        isOpen={!!selectedReportRow}
        analysis={selectedReportRow}
        currentUserId={currentUserId}
        onClose={() => setSelectedReportRow(null)}
        onReportGenerated={handleReportGenerated}
      />

      {/* Slide-over analysis matrix panel */}
      <AnalysisSidebar
        isOpen={isSidebarOpen}
        isSaving={isSubmitting}
        formState={formState}
        availableProjects={availableProjects}
        availablePipelines={availablePipelines}
        availableAssignees={availableAssignees}
        onClose={() => setIsSidebarOpen(false)}
        onChange={handleInputChange}
        onSubmit={handleCreateAnalysis}
      />
    </div>
  );
}
