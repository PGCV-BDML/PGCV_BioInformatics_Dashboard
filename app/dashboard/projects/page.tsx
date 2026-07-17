"use client";

import { useState, useMemo, useEffect } from "react";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import ProjectModal from "../../components/projectmodal";
import { DashboardBreadcrumbs } from "../../components/dashboardbreadcrumbs"; // Adjusted to match your import paths
import {
  Search,
  Network,
  Edit3,
  Trash2,
  Link2,
  ExternalLink,
  Plus,
  Inbox,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

type Project = {
  id: number;
  name: string;
  client_name: string;
  service_type: string;
  status: string;
  lead: string;
  start_date: string;
  target_delivery_date: string;
  repository_link?: string;
};

// Helper function to safely format "YYYY-MM-DD" to "MM/DD/YYYY"
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr; // Fallback to raw string if format is unexpected
  const [year, month, day] = parts;
  return `${month}/${day}/${year}`;
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: "De Novo Transcriptome Assembly Pipeline",
    client_name: "UP Visayas Marine Science",
    service_type: "Bioinformatics Analysis",
    status: "On-going",
    lead: "Dr. Analyst Cruz",
    start_date: "2026-05-10",
    target_delivery_date: "2026-07-20",
    repository_link: "https://github.com/upv-marine/transcriptome-pipeline",
  },
  {
    id: 2,
    name: "Metagenomic Sequencing Validation",
    client_name: "DOST Region VI",
    service_type: "Sequencing Service",
    status: "For approval",
    lead: "Prof. Lopez",
    start_date: "2026-06-01",
    target_delivery_date: "2026-08-15",
  },
  {
    id: 3,
    name: "Variant Calling on Rice Subspecies",
    client_name: "PhilRice",
    service_type: "Custom Workflow",
    status: "Submitted",
    lead: "Engr. Santos",
    start_date: "2026-04-12",
    target_delivery_date: "2026-06-30",
  },
  {
    id: 4,
    name: "RNA-Seq Differential Expression Analysis",
    client_name: "UP Manila",
    service_type: "Bioinformatics Analysis",
    status: "Completed",
    lead: "Dr. Cruz",
    start_date: "2026-02-10",
    target_delivery_date: "2026-04-15",
  },
  {
    id: 5,
    name: "ChIP-Seq Transcription Profiling",
    client_name: "MSU-IIT",
    service_type: "Custom Workflow",
    status: "On hold",
    lead: "Prof. Torres",
    start_date: "2026-03-01",
    target_delivery_date: "2026-06-15",
  },
];

const AVAILABLE_CLIENTS = [
  "UP Visayas Marine Science",
  "DOST Region VI",
  "PhilRice",
  "UP Manila",
  "MSU-IIT",
  "DOST-PCHRD",
  "PGH Pediatric Labs",
  "IRRI",
  "UP Diliman NIMBB",
  "Philippine Genome Center",
];

const AVAILABLE_SERVICES = [
  "Bioinformatics Analysis",
  "Sequencing Service",
  "Custom Workflow",
];

const AVAILABLE_USERS = [
  "Dr. Analyst Cruz",
  "Prof. Lopez",
  "Engr. Santos",
  "Dr. Cruz",
  "Prof. Torres",
];

const FILTER_OPTIONS = [
  "All",
  "Completed",
  "On-going",
  "Submitted",
  "For approval",
  "On hold",
];

export default function ProjectsPage() {
  const [projectsList, setProjectsList] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Project;
    direction: "asc" | "desc";
  } | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const isPanelOpen = isAdding || isEditing;

  // Breadcrumb configuration matching dashboard subpage design rules
  const breadcrumbTrail = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Projects" },
  ];

  const activeFilterIndex = useMemo(() => {
    return FILTER_OPTIONS.findIndex((opt) => opt === activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    const toggleEvent = new CustomEvent("toggle-dashboard-sidebar", {
      detail: { isOpen: isPanelOpen },
    });
    window.dispatchEvent(toggleEvent);
  }, [isPanelOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, itemsPerPage]);

  const updateProjectStatus = (projectId: number, newStatus: string) => {
    setProjectsList((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, status: newStatus } : proj,
      ),
    );
  };

  const updateProjectService = (projectId: number, newService: string) => {
    setProjectsList((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, service_type: newService } : proj,
      ),
    );
  };

  const handleSort = (key: keyof Project) => {
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

  const handleAddSubmit = async (formData: Omit<Project, "id">) => {
    const nextNumericId =
      projectsList.length > 0
        ? Math.max(...projectsList.map((p) => p.id)) + 1
        : 1;
    const runtimePayload: Project = { id: nextNumericId, ...formData };

    setProjectsList((prev) => [runtimePayload, ...prev]);
    setIsAdding(false);
  };

  const handleEditSubmit = async (formData: Omit<Project, "id">) => {
    if (!selectedProject) return;

    setProjectsList((prev) =>
      prev.map((item) =>
        item.id === selectedProject.id ? { ...item, ...formData } : item,
      ),
    );
    setIsEditing(false);
  };

  const handleDeleteRecord = async () => {
    if (!selectedProject) return;

    setProjectsList((prev) =>
      prev.filter((item) => item.id !== selectedProject.id),
    );
    setShowDeleteConfirm(false);
  };

  const filteredProjects = useMemo(() => {
    let records = projectsList;

    if (activeFilter !== "All") {
      records = records.filter((project) => {
        const normalProjectStatus = (project.status || "")
          .toLowerCase()
          .replace(/[\s-]/g, "");
        const normalFilter = activeFilter.toLowerCase().replace(/[\s-]/g, "");
        return normalProjectStatus === normalFilter;
      });
    }

    const cleansedQuery = searchQuery.toLowerCase().trim();
    if (!cleansedQuery) return records;

    return records.filter((project) =>
      Object.values(project).some((fieldValue) =>
        String(fieldValue ?? "")
          .toLowerCase()
          .includes(cleansedQuery),
      ),
    );
  }, [searchQuery, projectsList, activeFilter]);

  const sortedProjects = useMemo(() => {
    const itemsToProcess = [...filteredProjects];
    if (!sortConfig) return itemsToProcess;

    return itemsToProcess.sort((a, b) => {
      const valA = String(a[sortConfig.key] ?? "").toLowerCase();
      const valB = String(b[sortConfig.key] ?? "").toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortConfig]);

  const displayedProjects = useMemo(() => {
    const startOffset = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(startOffset, startOffset + itemsPerPage);
  }, [sortedProjects, currentPage, itemsPerPage]);

  const getStatusClass = (status: string) => {
    const baseClass =
      "text-[10px] font-bold uppercase tracking-wide pl-2 pr-6 py-0.5 rounded-full border text-center shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400";
    const normal = status.toLowerCase().replace(/[\s-]/g, "");

    if (normal === "completed") {
      return `${baseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
    }
    if (normal === "ongoing" || normal === "inprogress") {
      return `${baseClass} bg-[#fffde7] text-[#f57f17] border-[#fff9c4]`;
    }
    if (normal === "onhold" || normal === "overdue") {
      return `${baseClass} bg-[#ffebee] text-[#c62828] border-[#ffcdd2]`;
    }
    if (normal === "submitted") {
      return `${baseClass} bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]`;
    }
    return `${baseClass} bg-[#f5f3ff] text-[#6d28d9] border-[#ede9fe]`;
  };

  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      width: "20%",
      sortable: true,
      render: (p) => (
        <span className="font-bold text-[#11161a] block whitespace-normal break-words leading-snug py-1">
          {p.name}
        </span>
      ),
    },
    {
      key: "client_name",
      label: "Client",
      width: "13%",
      sortable: true,
      render: (p) => <span className="block">{p.client_name}</span>,
    },
    {
      key: "service_type",
      label: "Service Category",
      width: "13%",
      render: (p) => (
        <div className="relative block w-full whitespace-normal break-words">
          <select
            value={p.service_type}
            onChange={(e) => updateProjectService(p.id, e.target.value)}
            className="w-full text-[10px] font-bold pl-2 pr-6 py-1 bg-[#f0f2f3] text-[#4a5963] border border-gray-200/50 rounded-xl block shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 whitespace-normal break-words leading-tight"
          >
            {AVAILABLE_SERVICES.map((srv) => (
              <option
                key={srv}
                value={srv}
                className="bg-white text-slate-900 font-normal normal-case"
              >
                {srv}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-current" />
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      sortable: true,
      render: (p) => (
        <div className="relative inline-block w-full min-w-[95px]">
          <select
            value={p.status}
            onChange={(e) => updateProjectStatus(p.id, e.target.value)}
            className={getStatusClass(p.status)}
          >
            {FILTER_OPTIONS.filter((o) => o !== "All").map((opt) => (
              <option
                key={opt}
                value={opt}
                className="bg-white text-slate-900 font-normal normal-case"
              >
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-current" />
        </div>
      ),
    },
    { key: "lead", label: "Lead", width: "10%", sortable: true },
    {
      key: "start_date",
      label: "Start Date",
      width: "9%",
      sortable: true,
      render: (p) => (
        <span className="text-xs text-slate-600">
          {formatDate(p.start_date)}
        </span>
      ),
    },
    {
      key: "target_delivery_date",
      label: "Delivery Date",
      width: "9%",
      sortable: true,
      render: (p) => (
        <span className="text-xs text-slate-600">
          {formatDate(p.target_delivery_date)}
        </span>
      ),
    },
    {
      key: "repository_link",
      label: "Repository Link",
      width: "14%",
      render: (p) =>
        p.repository_link ? (
          <a
            href={p.repository_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted whitespace-nowrap"
          >
            <Link2 className="w-3.5 h-3.5 flex-shrink-0" /> Repo
            <ExternalLink className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">None</span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      width: "10%",
      render: (p) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setIsEditing(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all duration-200 shadow-sm"
            title="Edit Project"
          >
            <Edit3 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-105" />
            <ChevronRight className="w-3 h-3 opacity-0 max-w-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] group-hover/btn:translate-x-0 transition-all duration-200 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setShowDeleteConfirm(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-all duration-200 shadow-sm"
            title="Delete Project"
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
      className={`space-y-8 mx-auto font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${
        isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      {/* Top Header Controls Area completely standardized to match styling specs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          {/* Breadcrumbs Component placement */}
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <DashboardBreadcrumbs items={breadcrumbTrail} />
          </div>

          {/* Main Title standard size layout */}
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Projects
          </h1>

          {/* Subheader tracking text layout */}
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Operational workflows · Manage genomic execution matrices and
            project pipelines
          </p>
        </div>

        {/* Action Controls uniform structure alignment */}
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full min-[480px]:w-44">
            <div className="relative flex items-center bg-[#fffdf8] rounded-full border border-gray-200 px-3 h-10 shadow-sm w-full">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-transparent text-xs text-slate-700 outline-none pr-5 cursor-pointer font-medium appearance-none w-full"
              >
                <option value={5}>Show 5 rows</option>
                <option value={7}>Show 7 rows</option>
                <option value={10}>Show 10 rows</option>
                <option value={20}>Show 20 rows</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-slate-500" />
            </div>
          </div>

          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedProject(null);
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Project
          </button>
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              List of Projects
            </h2>
          </div>

          <div className="relative flex items-center bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar max-w-full self-start lg:self-auto">
            <div
              style={{ transform: `translateX(${activeFilterIndex * 100}%)` }}
              className="absolute top-1 bottom-1 left-1 w-28 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100 transition-transform duration-300 ease-out pointer-events-none"
            />

            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`relative z-10 w-28 py-1.5 rounded-full text-xs text-center transition-colors duration-300 whitespace-nowrap select-none ${
                    isActive
                      ? "text-[#2a7797] font-semibold"
                      : "text-slate-500 hover:text-slate-800 font-medium"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No matching projects discovered
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[960px]">
            <DataTable
              columns={columns}
              data={displayedProjects}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={filteredProjects.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <ProjectModal
        isOpen={isPanelOpen}
        isAdding={isAdding}
        initialData={
          selectedProject
            ? {
                name: selectedProject.name,
                client_name: selectedProject.client_name,
                service_type: selectedProject.service_type,
                status: selectedProject.status,
                lead: selectedProject.lead,
                start_date: selectedProject.start_date,
                target_delivery_date: selectedProject.target_delivery_date,
                repository_link: selectedProject.repository_link || "",
              }
            : null
        }
        availableClients={AVAILABLE_CLIENTS}
        availableServices={AVAILABLE_SERVICES}
        availableUsers={AVAILABLE_USERS}
        onClose={() => {
          setIsAdding(false);
          setIsEditing(false);
        }}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedProject?.name || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}
