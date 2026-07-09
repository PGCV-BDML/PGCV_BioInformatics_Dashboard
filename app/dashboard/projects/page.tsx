"use client";

import { useState, useMemo, useEffect } from "react";
// [SUPABASE IMPORT CONFIG]
// import { supabase } from "@/lib/supabase";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import ProjectModal from "../../components/projectmodal";
import {
  Search,
  Network,
  Edit3,
  Trash2,
  Link2,
  ExternalLink,
  Plus,
  Inbox,
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

const ITEMS_PER_PAGE = 10;

// Internal client mocks used for standard testing
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

export default function ProjectsPage() {
  // --- STATE CONFIGURATION ---
  const [projectsList, setProjectsList] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Project;
    direction: "asc" | "desc";
  } | null>(null);

  // Structural display controllers
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Reset pagination dynamically when query parameters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- 1. DATA INITIALIZATION & LIFECYCLE SYNC ---
  useEffect(() => {
    async function syncDatabaseLayer() {
      try {
        // [SUPABASE SELECT REGION]
        // Wire in database connection routine:
        // const { data } = await supabase.from("projects").select("*").order("created_at");
        // if(data) setProjectsList(data);
      } catch (err) {
        console.error("Failed to fetch primary project entries:", err);
      }
    }
    syncDatabaseLayer();
  }, []);

  // --- 2. CONTROL CLICKS & INPUT UTILITIES ---
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

  // --- 3. MUTATION HANDLERS (PREPARED FOR SUPABASE) ---
  const handleAddSubmit = async (formData: Omit<Project, "id">) => {
    // Local processing calculations (Safeguarded against array mutations)
    const nextNumericId =
      projectsList.length > 0
        ? Math.max(...projectsList.map((p) => p.id)) + 1
        : 1;
    const runtimePayload: Project = { id: nextNumericId, ...formData };

    // [SUPABASE INSERT PIPELINE]
    // const { data, error } = await supabase.from("projects").insert([formData]).select().single();
    // if(!error) setProjectsList(prev => [data, ...prev]);

    setProjectsList((prev) => [runtimePayload, ...prev]);
    setIsAdding(false);
  };

  const handleEditSubmit = async (formData: Omit<Project, "id">) => {
    if (!selectedProject) return;

    // [SUPABASE UPDATE PIPELINE]
    // const { data, error } = await supabase.from("projects").update(formData).eq("id", selectedProject.id);

    setProjectsList((prev) =>
      prev.map((item) =>
        item.id === selectedProject.id ? { ...item, ...formData } : item,
      ),
    );
    setIsEditing(false);
  };

  const handleDeleteRecord = async () => {
    if (!selectedProject) return;

    // [SUPABASE REMOVE PIPELINE]
    // const { error } = await supabase.from("projects").delete().eq("id", selectedProject.id);

    setProjectsList((prev) =>
      prev.filter((item) => item.id !== selectedProject.id),
    );
    setShowDeleteConfirm(false);
  };

  // --- 4. DATA COMPILATION MEMOS ---
  const filteredProjects = useMemo(() => {
    const cleansedQuery = searchQuery.toLowerCase().trim();
    if (!cleansedQuery) return projectsList;

    return projectsList.filter((project) =>
      Object.values(project).some((fieldValue) =>
        String(fieldValue ?? "")
          .toLowerCase()
          .includes(cleansedQuery),
      ),
    );
  }, [searchQuery, projectsList]);

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
    const startOffset = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProjects.slice(startOffset, startOffset + ITEMS_PER_PAGE);
  }, [sortedProjects, currentPage]);

  // --- 5. INTERFACE COMPONENT CHUNKS ---
  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[10px] font-bold font-aileron text-center min-w-[92px] inline-block tracking-wide uppercase";
    const normal = status.toLowerCase().replace(/[\s-]/g, "");

    if (normal === "completed")
      return (
        <span className={`${baseClass} bg-[#eaf7ee] text-[#2e7d32]`}>
          Completed
        </span>
      );
    if (normal === "ongoing" || normal === "inprogress")
      return (
        <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
          In-Progress
        </span>
      );
    if (normal === "onhold" || normal === "overdue")
      return (
        <span className={`${baseClass} bg-[#ffebee] text-[#c62828]`}>
          Overdue
        </span>
      );
    if (normal === "submitted")
      return (
        <span className={`${baseClass} bg-[#f5f5f5] text-[#616161]`}>
          Submitted
        </span>
      );
    return (
      <span className={`${baseClass} bg-[#efebe9] text-[#4e342e]`}>
        For Approval
      </span>
    );
  };

  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      width: "16%",
      sortable: true,
      render: (p) => <span className="font-bold text-[#11161a]">{p.name}</span>,
    },
    { key: "client_name", label: "Client", width: "14%", sortable: true },
    {
      key: "service_type",
      label: "Service Type",
      width: "12%",
      render: (p) => (
        <span className="px-2.5 py-0.5 bg-[#f0f2f3] text-[#4a5963] rounded-full text-[12px] font-bold inline-block">
          {p.service_type}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "10%",
      render: (p) => renderStatusBadge(p.status),
    },
    { key: "lead", label: "Lead", width: "10%", sortable: true },
    { key: "start_date", label: "Start Date", width: "11%", sortable: true },
    {
      key: "target_delivery_date",
      label: "Target Delivery",
      width: "11%",
      sortable: true,
    },
    {
      key: "repository_link",
      label: "Repository Link",
      width: "12%",
      render: (p) =>
        p.repository_link ? (
          <a
            href={p.repository_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-black font-semibold bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-500" /> <span>Repo</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">None</span>
        ),
    },
    {
      key: "id",
      label: "Actions",
      width: "8%",
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setIsEditing(true);
            }}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto font-aileron">
      {/* Control Navigation Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - List
          </span>
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
            List of Projects
          </h1>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full min-[480px]:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-[14px] outline-none focus:ring-2 focus:ring-[#4ec2bb]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedProject(null);
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-full shadow-md transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Project
          </button>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Network className="w-6 h-6 text-[#333333]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            List of Projects
          </h2>
        </div>

        {projectsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No current projects recorded
            </span>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={displayedProjects}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={filteredProjects.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Reusable Project Layout Configuration Modal */}
      <ProjectModal
        isOpen={isAdding || isEditing}
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

      <ComplianceFooter />
    </div>
  );
}
