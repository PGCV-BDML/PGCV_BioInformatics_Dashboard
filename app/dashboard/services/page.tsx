"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import AnalysisSidebar, {
  AnalysisFormState,
} from "../../components/analysismodal";
import {
  Search,
  Dna,
  FileText,
  ChevronDown,
  Plus,
  Inbox,
  ExternalLink,
} from "lucide-react";

interface ServiceProjectRow {
  id: string;
  project_name: string;
  client: string;
  service_type: string;
  analysis_pipeline: string;
  status: "for_approval" | "ongoing" | "finished";
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
    href: "/dashboard/services",
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
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "finished", label: "Finished" },
];

const STATUS_OPTIONS = [
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "finished", label: "Finished" },
];

const PROJECT_REGISTRY = [
  {
    id: "proj-1",
    name: "Tumor Exome Alignment Alpha",
    client: "Apex Oncology Lab",
  },
  {
    id: "proj-2",
    name: "Metagenomic Flora Profile",
    client: "BioBiome Pharma",
  },
  {
    id: "proj-3",
    name: "Crispr Off-Target Scan",
    client: "Vertex Therapeutics",
  },
  {
    id: "proj-4",
    name: "RNA-Seq Pathway Mapping",
    client: "Genomics Research Inst.",
  },
];

const ASSIGNEE_REGISTRY = [
  "Dr. Alex Jones",
  "Maria Santos",
  "Dr. Sarah Jenkins",
  "Elena Rostova",
];

const PIPELINE_OPTIONS = [
  "WES-GATK",
  "16S-QIIME2",
  "CRISPR-Cas9-Seq",
  "RNA-Seq-Kallisto",
];

const ITEMS_PER_PAGE = 10;

const MOCK_SERVICES_DATA: ServiceProjectRow[] = [
  {
    id: "srv-1",
    project_name: "Tumor Exome Alignment Alpha",
    client: "Apex Oncology Lab",
    service_type: "Sequence Analysis",
    analysis_pipeline: "WES-GATK v4.2",
    status: "ongoing",
    assignee: "Dr. Alex Jones",
    started: "2026-02-10",
    completed: "—",
    report_link: "",
  },
  {
    id: "srv-2",
    project_name: "Metagenomic Flora Profile",
    client: "BioBiome Pharma",
    service_type: "Sequence Analysis",
    analysis_pipeline: "16S-QIIME2 v2023.9",
    status: "finished",
    assignee: "Maria Santos",
    started: "2026-01-05",
    completed: "2026-01-20",
    report_link: "https://drive.google.com/qiime2-flora",
  },
  {
    id: "srv-3",
    project_name: "Crispr Off-Target Scan",
    client: "Vertex Therapeutics",
    service_type: "Sequence Analysis",
    analysis_pipeline: "CRISPR-Cas9-Seq v1.0",
    status: "for_approval",
    assignee: "Dr. Alex Jones",
    started: "2026-03-01",
    completed: "—",
    report_link: "",
  },
];

export default function ServicesPage() {
  const [servicesList, setServicesList] =
    useState<ServiceProjectRow[]>(MOCK_SERVICES_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("sequence-analysis");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ServiceProjectRow;
    direction: "asc" | "desc";
  } | null>(null);

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

  const handleStatusChange = (id: string, newStatus: string) => {
    setServicesList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const completedDate =
            newStatus === "finished"
              ? new Date().toISOString().split("T")[0]
              : "—";
          return {
            ...item,
            status: newStatus as ServiceProjectRow["status"],
            completed: completedDate,
          };
        }
        return item;
      }),
    );
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

  const handleCreateAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProject = PROJECT_REGISTRY.find(
      (p) => p.id === formState.project_id,
    );
    if (!targetProject) return;

    const newAnalysis: ServiceProjectRow = {
      id: `srv-${Date.now()}`,
      project_name: targetProject.name,
      client: targetProject.client,
      service_type: "Sequence Analysis",
      analysis_pipeline: `${formState.pipeline} ${formState.pipeline_version}`,
      status: formState.status,
      assignee: formState.assignee,
      started: new Date().toISOString().split("T")[0],
      completed:
        formState.status === "finished"
          ? new Date().toISOString().split("T")[0]
          : "—",
      report_link: "",
    };

    setServicesList((prev) => [newAnalysis, ...prev]);

    setFormState({
      project_id: "",
      pipeline: "",
      pipeline_version: "v1.0.0",
      assignee: "",
      status: "for_approval",
    });
    setIsSidebarOpen(false);
  };

  const generateExternalReportUrl = (row: ServiceProjectRow) => {
    const matchedProj = PROJECT_REGISTRY.find(
      (p) => p.name === row.project_name,
    );
    const projectId = matchedProj ? matchedProj.id : "unknown-proj";
    const clientId = row.client.toLowerCase().replace(/\s+/g, "-");

    return `/dashboard/services/report-generator?project_id=${encodeURIComponent(projectId)}&client_id=${encodeURIComponent(clientId)}&analysis_id=${encodeURIComponent(row.id)}`;
  };

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportRow) return;

    setServicesList((prev) =>
      prev.map((item) =>
        item.id === selectedReportRow.id
          ? {
              ...item,
              report_link: fallbackUrl,
              delivered_by: "Current User",
              delivered_at: new Date()
                .toISOString()
                .replace("T", " ")
                .substring(0, 19),
              client_acknowledged_at: clientAck
                ? new Date().toISOString().split("T")[0]
                : undefined,
            }
          : item,
      ),
    );

    setSelectedReportRow(null);
    setFallbackUrl("");
    setClientAck(false);
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

    // Weight map matching the task progression timeline status
    const statusWeights: Record<string, number> = {
      for_approval: 1,
      ongoing: 2,
      finished: 3,
    };

    return sortableItems.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      // 1. Column Rule: Status Custom Weights Logic
      if (key === "status") {
        const weightA = statusWeights[String(valA)] || 99;
        const weightB = statusWeights[String(valB)] || 99;
        return isAsc ? weightA - weightB : weightB - weightA;
      }

      // 2. Column Rule: Date Sorting (Earliest and Latest Timeline checks)
      if (key === "started" || key === "completed") {
        const strA = String(valA || "").trim();
        const strB = String(valB || "").trim();

        // Treat dashes, blanks, or empty states as infinite future dates so they gather at the bottom
        const timeA =
          strA === "—" || !strA ? Infinity : new Date(strA).getTime();
        const timeB =
          strB === "—" || !strB ? Infinity : new Date(strB).getTime();

        if (timeA === timeB) return 0;
        return isAsc ? timeA - timeB : timeB - timeA;
      }

      // 3. Fallback Rule: Stable Alphabetical Sort (Project Name, Client, Service Type, Pipeline, Assignee)
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

  // Find index of current active filter option for sliding offset
  const activeFilterIndex = useMemo(() => {
    return FILTER_OPTIONS.findIndex((opt) => opt.value === activeFilter);
  }, [activeFilter]);

  const renderStatusDropdown = (id: string, currentStatus: string) => {
    let colorClasses = "bg-gray-100 text-gray-700";
    let chevronClass = "text-gray-500";

    if (currentStatus === "finished") {
      colorClasses = "bg-[#eaf7ee] text-[#2e7d32]";
      chevronClass = "text-[#2e7d32]";
    } else if (currentStatus === "ongoing") {
      colorClasses = "bg-[#fffde7] text-[#f57f17]";
      chevronClass = "text-[#f57f17]";
    } else if (currentStatus === "for_approval") {
      colorClasses = "bg-blue-50 text-blue-700";
      chevronClass = "text-blue-700";
    }

    return (
      <div className="relative flex items-center justify-center w-full max-w-[130px]">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(id, e.target.value)}
          className={`pl-3 pr-7 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm cursor-pointer border-0 outline-none focus:outline-none focus:ring-0 text-center appearance-none whitespace-nowrap w-full transition-all ${colorClasses}`}
        >
          {STATUS_OPTIONS.map((opt) => (
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
        const isCompleted = s.status === "finished";

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
      className={`space-y-6 mx-auto font-aileron w-full max-w-[1240px] px-4 py-6 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? "mr-96 xl:mr-[440px]" : "mr-auto"
      }`}
    >
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Bioinformation Services
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            Bioinformatics Services
          </h1>
        </div>

        {/* Search Input Box & Sidebar Trigger button */}
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search analysis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/50 shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Analysis
          </button>
        </div>
      </div>

      {/* Navigation Capsule Navigation Row */}
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

      {/* Main Table Design Box Segment */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              Service Report Tracker
            </h2>
          </div>

          {/* Animated Filter Bar Wrapper */}
          <div className="relative flex items-center bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full w-fit overflow-hidden shadow-inner">
            {/* Sliding Pill Background Indicator */}
            <div
              className="absolute top-1 bottom-1 left-1 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100/80 transition-transform duration-300 ease-in-out"
              style={{
                width: "112px", // Matches button width (w-28 = 112px)
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

        {/* DataTable Content Matrix Loader */}
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

      {/* Service Report Generator Modal & Fallback Flow */}
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

            <div className="bg-[#f0f9ff] border border-blue-100 rounded-2xl p-4 mb-6">
              <span className="text-[10px] uppercase font-bold text-[#2a7797] tracking-wider block mb-2">
                Primary Integration Method
              </span>
              <p className="text-xs text-slate-600 mb-4">
                Open the laboratory's existing Service Report Generator. It will
                load pre-filled with this analysis data.
              </p>
              <a
                href={generateExternalReportUrl(selectedReportRow)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2a7797] hover:bg-[#205b74] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Report Generator
              </a>
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

      {/* Slide-over Analysis configuration panel */}
      <AnalysisSidebar
        isOpen={isSidebarOpen}
        formState={formState}
        availableProjects={PROJECT_REGISTRY}
        availablePipelines={PIPELINE_OPTIONS}
        availableAssignees={ASSIGNEE_REGISTRY}
        onClose={() => setIsSidebarOpen(false)}
        onChange={handleFormChange}
        onSubmit={handleCreateAnalysis}
      />
    </div>
  );
}
