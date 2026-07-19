"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import AnalysisSidebar, {
  AnalysisFormState,
} from "../../components/analysismodal";
import { DashboardBreadcrumbs } from "../../components/dashboardbreadcrumbs";
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
  supabase,
} from "@/lib/supabase";
import { Analysis, AnalysisStatus, ANALYSIS_STATUS_OPTIONS } from "../../../types/database";

interface ServiceProjectRow {
  id: string;
  project_name: string;
  client: string;
  service_type: string;
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

const SERVICES_CONFIG = [
  {
    id: "sequence-analysis",
    title: "3.1 — Client Sequence Analysis",
    href: "/dashboard/services", // Primary entrypoint for Bioinformatics Services
  },
  {
    id: "training",
    title: "3.2 — Training",
    href: "/dashboard/services/training",
  },
  {
    id: "internship",
    title: "3.3 — Internship",
    href: "/dashboard/services/internship",
  },
];

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ServiceProjectRow;
    direction: "asc" | "desc";
  } | null>(null);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string; client: string }[]>([]);
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
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [clientAck, setClientAck] = useState(false);

  // Dynamic breadcrumbs trail mapping configuration
  const breadcrumbTrail = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Bioinformatics Services", href: "/dashboard/services" },
    { label: "3.1 Client Sequence Analysis" },
  ];

  // Dispatches framework side shifts for primary outer layout layout nodes
  useEffect(() => {
    const toggleEvent = new CustomEvent("toggle-dashboard-sidebar", {
      detail: { isOpen: isSidebarOpen },
    });
    window.dispatchEvent(toggleEvent);
  }, [isSidebarOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [analyses, projects, clients, services, users, user] = await Promise.all([
          getRowsFromDB("analysis"),
          getRowsFromDB("project"),
          getNameIdFromDB("client"),
          getNameIdFromDB("service"),
          getUsersFromDB(["team_lead", "team_member", "intern", "trainee"]),
          getCurrentUser(),
        ]);
        setCurrentUserId(user?.id ?? null);

        const projectMap = new Map<string, { name: string; client: string }>();
        for (const p of projects as any[]) {
          const client = clients.find((c: any) => c.id === p.client_id);
          projectMap.set(p.id, { name: p.name, client: client?.name ?? "—" });
        }

        const serviceMap = new Map<string, string>();
        for (const s of services as any[]) {
          serviceMap.set(s.id, s.name);
        }

        const userMap = new Map<string, string>();
        for (const u of users as any[]) {
          userMap.set(u.id, u.name);
        }

        const rows: ServiceProjectRow[] = (analyses as any[]).map((a) => {
          const proj = projectMap.get(a.project_id);
          const assigneeName = userMap.get(a.assignee_id) ?? "Unassigned";
          const pipeline = `${a.pipeline ?? ""} ${a.pipeline_version ?? ""}`.trim();
          return {
            id: a.id,
            project_name: proj?.name ?? "(unknown project)",
            client: proj?.client ?? "—",
            service_type: "Sequence Analysis",
            analysis_pipeline: pipeline || "—",
            status: a.status as ServiceProjectRow["status"],
            assignee: assigneeName,
            started: a.started_at ? a.started_at.split("T")[0] : "—",
            completed: a.completed_at ? a.completed_at.split("T")[0] : "—",
            report_link: "",
          };
        });

        setServicesList(rows);
        setAvailableProjects(
          Array.from(projectMap.entries()).map(([id, v]) => ({ id, ...v })),
        );
        setAvailablePipelines(
          Array.from(new Set((analyses as any[]).map((a) => a.pipeline).filter(Boolean))) as string[],
        );
        setAvailableAssignees(Array.from(userMap.values()));
      } catch (err) {
        console.error("Error loading services data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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
                completed: updated.completed_at ? updated.completed_at.split("T")[0] : "—",
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error updating analysis status:", err);
    }
  };

  const handleSort = (key: keyof ServiceProjectRow) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleFormChange = (key: keyof AnalysisFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      console.error("No current user — cannot create analysis");
      return;
    }
    try {
      // Look up the assignee user id by name (assignees dropdown shows names)
      const users = await getUsersFromDB(["team_lead", "team_member", "intern", "trainee"]);
      const matchedUser = (users as any[]).find((u) => u.name === formState.assignee);
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
        service_type: "Sequence Analysis",
        analysis_pipeline: `${formState.pipeline} ${formState.pipeline_version}`.trim() || "—",
        status: created.status as ServiceProjectRow["status"],
        assignee: formState.assignee,
        started: startedAt.split("T")[0],
        completed: completedAt ? completedAt.split("T")[0] : "—",
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
    } catch (err) {
      console.error("Error creating analysis:", err);
    }
  };

  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportRow || !currentUserId) return;

    try {
      await saveDataToDB("service_report", crypto.randomUUID(), {
        analysis_id: selectedReportRow.id,
        report_link: fallbackUrl,
        delivered_by: currentUserId,
        delivered_at: new Date().toISOString(),
        client_acknowledged_at: clientAck ? new Date().toISOString() : null,
      });
      setServicesList((prev) =>
        prev.map((item) =>
          item.id === selectedReportRow.id
            ? { ...item, report_link: fallbackUrl }
            : item,
        ),
      );
      setSelectedReportRow(null);
      setFallbackUrl("");
      setClientAck(false);

      // Audit trail for report delivery
      supabase.rpc("audit_data_modification", {
        target_type: "service_report",
        target_id: selectedReportRow.id,
        event_details: { action: "delivered", report_link: fallbackUrl },
      }).then(({ error }) => {
        if (error) console.error("audit_data_modification (deliver) failed:", error);
      });
    } catch (err) {
      console.error("Error saving service report:", err);
    }
  };

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

  const sortedServices = useMemo(() => {
    const sortableItems = [...filteredServices];
    if (!sortConfig) return sortableItems;

    const { key, direction } = sortConfig;
    const isAsc = direction === "asc";

    const statusWeights: Record<string, number> = {
      for_approval: 1,
      ongoing: 2,
      on_hold: 3,
      submitted: 4,
      completed: 5,
    };

    return sortableItems.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (key === "status") {
        const weightA = statusWeights[String(valA)] || 99;
        const weightB = statusWeights[String(valB)] || 99;
        return isAsc ? weightA - weightB : weightB - weightA;
      }

      if (key === "started" || key === "completed") {
        const strA = String(valA || "").trim();
        const strB = String(valB || "").trim();

        const timeA =
          strA === "—" || !strA ? Infinity : new Date(strA).getTime();
        const timeB =
          strB === "—" || !strB ? Infinity : new Date(strB).getTime();

        if (timeA === timeB) return 0;
        return isAsc ? timeA - timeB : timeB - timeA;
      }

      const stringA = String(valA || "").trim();
      const stringB = String(valB || "").trim();

      return isAsc
        ? stringA.localeCompare(stringB, undefined, {
            sensitivity: "base",
            numeric: true,
          })
        : stringB.localeCompare(stringA, undefined, {
            sensitivity: "base",
            numeric: true,
          });
    });
  }, [filteredServices, sortConfig]);

  const displayedServices = useMemo(() => {
    const startOffset = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedServices.slice(startOffset, startOffset + ITEMS_PER_PAGE);
  }, [sortedServices, currentPage]);

  const activeFilterIndex = useMemo(() => {
    return FILTER_OPTIONS.findIndex((opt) => opt.value === activeFilter);
  }, [activeFilter]);

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

  const columns: Column<ServiceProjectRow>[] = [
    {
      key: "project_name",
      label: "Project Name",
      width: "16%",
      sortable: true,
      render: (s) => (
        <Link
          href={`/dashboard/services/${s.id}`}
          className="font-bold text-[#2a7797] hover:text-[#4ec2bb] block truncate max-w-[160px] underline decoration-transparent hover:decoration-current transition-all"
          title={s.project_name}
        >
          {s.project_name}
        </Link>
      ),
    },
    {
      key: "client",
      label: "Client",
      width: "12%",
      sortable: true,
      render: (s) => (
        <span
          className="block truncate font-medium text-slate-700"
          title={s.client}
        >
          {s.client}
        </span>
      ),
    },
    {
      key: "service_type",
      label: "Service Type",
      width: "12%",
      sortable: true,
    },
    {
      key: "analysis_pipeline",
      label: "Analysis Pipeline",
      width: "13%",
      sortable: true,
      render: (s) => (
        <code className="bg-slate-50 text-xs text-slate-600 px-1.5 py-0.5 border border-slate-200 rounded font-mono">
          {s.analysis_pipeline}
        </code>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "13%",
      render: (s) => (
        <div className="flex items-center justify-center w-full">
          {renderStatusDropdown(s.id, s.status)}
        </div>
      ),
    },
    {
      key: "assignee",
      label: "Assignee",
      width: "11%",
      sortable: true,
    },
    {
      key: "started",
      label: "Started",
      width: "9%",
      sortable: true,
    },
    {
      key: "completed",
      label: "Completed",
      width: "9%",
      sortable: true,
    },
    {
      key: "report_link",
      label: "Report / Actions",
      width: "14%",
      render: (s) => {
        const isCompleted = s.status === "completed";

        return (
          <div className="flex flex-col gap-1.5 items-start">
            {s.report_link ? (
              <a
                href={s.report_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#2e7d32] hover:text-[#4ec2bb] font-bold underline decoration-dotted truncate max-w-[110px]"
                title={s.report_link}
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
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div
      className={`space-y-8 mx-auto font-aileron w-full transition-all duration-300 ease-in-out ${
        isSidebarOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      {/* Top Header Controls Layout */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          {/* Breadcrumbs Component trail mapping */}
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <DashboardBreadcrumbs items={breadcrumbTrail} />
          </div>

          {/* Standardized Title Typography */}
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Bioinformatics Services
          </h1>

          {/* Core Subheader layout line */}
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Operational workflows · Review active sequences, configurations, and
            analytical reporting metrics
          </p>
        </div>

        {/* Action Controls Input alignment mapping */}
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search analysis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Analysis
          </button>
        </div>
      </div>

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
                  : "bg-[#fffdf8] text-slate-600 border-slate-300/60 shadow-md shadow-slate-400/10 hover:bg-slate-50/50 hover:text-slate-800"
              }`}
            >
              {service.title}
            </Link>
          );
        })}
      </div>

      {/* Main Table Design Layout */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              Service Report Tracker
            </h2>
          </div>

          {/* Animated Filter Bar Capsule */}
          <div className="relative flex items-center bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full w-fit overflow-hidden shadow-inner">
            <div
              className="absolute top-1 bottom-1 left-1 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100/80 transition-transform duration-300 ease-in-out"
              style={{
                width: "112px",
                transform: `translateX(${activeFilterIndex * 112}px)`,
              }}
            />
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActiveFilter(opt.value)}
                  className={`relative z-10 w-28 py-1.5 rounded-full text-xs text-center transition-colors duration-300 select-none whitespace-nowrap ${
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

        {/* DataTable Wrapper */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm font-medium text-slate-400 animate-pulse">
              Loading pipeline matrices...
            </span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No service records found tracking this query criteria.
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[1100px]">
            <DataTable
              columns={columns}
              data={displayedServices}
              sortConfig={sortConfig}
              onSort={handleSort}
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

      {/* Service Report Generator Modal */}
      {selectedReportRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                Generate Service Report
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Project:{" "}
                <span className="font-semibold">
                  {selectedReportRow.project_name}
                </span>
              </p>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Or Fallback
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleFallbackSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Fallback Report URL link
                </label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://drive.google.com/..."
                  value={fallbackUrl}
                  onChange={(e) => setFallbackUrl(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/50"
                />
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                <input
                  type="checkbox"
                  id="clientAck"
                  checked={clientAck}
                  onChange={(e) => setClientAck(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-[#2a7797] focus:ring-[#2a7797]"
                />
                <label
                  htmlFor="clientAck"
                  className="text-xs text-slate-600 cursor-pointer select-none"
                >
                  <span className="font-semibold block text-slate-700">
                    Client Acknowledged
                  </span>
                  Check this box if the client has already acknowledged receipt
                  of delivery.
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReportRow(null);
                    setFallbackUrl("");
                    setClientAck(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all"
                >
                  Save Fallback Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over analysis matrix panel */}
      <AnalysisSidebar
        isOpen={isSidebarOpen}
        formState={formState}
        availableProjects={availableProjects}
        availablePipelines={availablePipelines}
        availableAssignees={availableAssignees}
        onClose={() => setIsSidebarOpen(false)}
        onChange={handleFormChange}
        onSubmit={handleCreateAnalysis}
      />
    </div>
  );
}
