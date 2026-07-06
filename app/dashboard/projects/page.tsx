"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import EditProjectModal from "../../components/editmodal";
import NewProjectModal from "../../components/addmodal";
import {
  Search,
  Network,
  Edit3,
  Trash2,
  Save,
  Link2,
  Plus,
  ClipboardCheck,
  FlaskConical,
  User,
  Calendar,
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
  const router = useRouter();
  const [projectsList, setProjectsList] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Project;
    direction: "asc" | "desc";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) =>
      Object.values(project).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [searchQuery, projectsList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sortedProjects = useMemo(() => {
    let sortableItems = [...filteredProjects];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key]! < b[sortConfig.key]!)
          return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key]! > b[sortConfig.key]!)
          return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProjects, sortConfig]);

  const displayedProjects = useMemo(() => {
    const startOffset = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(startOffset, startOffset + itemsPerPage);
  }, [sortedProjects, currentPage]);

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

  const handleAddNewProjectSubmit = (newProjectData: Omit<Project, "id">) => {
    const generatedId =
      projectsList.length > 0
        ? Math.max(...projectsList.map((p) => p.id)) + 1
        : 1;

    const instantiatedProject: Project = {
      id: generatedId,
      ...newProjectData,
    };

    setProjectsList((prev) => [instantiatedProject, ...prev]);
    setIsAdding(false);
  };

  const handleDeleteRecord = () => {
    if (!selectedProject) return;
    setProjectsList((prev) =>
      prev.filter((item) => item.id !== selectedProject.id),
    );
    setShowDeleteConfirm(false);
  };

  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[10px] font-bold font-aileron text-center min-w-[92px] inline-block tracking-wide uppercase";
    const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, "");

    switch (normalizedStatus) {
      case "completed":
        return (
          <span className={`${baseClass} bg-[#eaf7ee] text-[#2e7d32]`}>
            Completed
          </span>
        );
      case "ongoing":
      case "inprogress":
        return (
          <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
            In-Progress
          </span>
        );
      case "onhold":
      case "overdue":
        return (
          <span className={`${baseClass} bg-[#ffebee] text-[#c62828]`}>
            Overdue
          </span>
        );
      case "submitted":
        return (
          <span className={`${baseClass} bg-[#f5f5f5] text-[#616161]`}>
            Submitted
          </span>
        );
      case "forapproval":
        return (
          <span className={`${baseClass} bg-[#efebe9] text-[#4e342e]`}>
            For Approval
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-gray-100 text-gray-600`}>
            {status}
          </span>
        );
    }
  };

  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      width: "20%",
      sortable: true,
      render: (p) => <span className="font-bold text-[#11161a]">{p.name}</span>,
    },
    { key: "client_name", label: "Client", width: "16%", sortable: true },
    {
      key: "service_type",
      label: "Service Type",
      width: "14%",
      render: (p) => (
        <span className="px-2.5 py-0.5 bg-[#f0f2f3] text-[#4a5963] rounded-full text-[12px] font-bold inline-block">
          {p.service_type}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      render: (p) => renderStatusBadge(p.status),
    },
    { key: "lead", label: "Lead", width: "12%", sortable: true },
    { key: "start_date", label: "Start Date", width: "13%", sortable: true },
    {
      key: "target_delivery_date",
      label: "Target Delivery",
      width: "13%",
      sortable: true,
    },
    {
      key: "actions",
      label: "Actions",
      width: "10%",
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedProject(p);
              setEditForm({ ...p, repository_link: p.repository_link || "" });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Projects
        </h1>
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
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
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-[#4ec2bb] hover:bg-[#3fb0a9] text-white text-sm font-bold rounded-full shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Project
          </button>
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Network className="w-6 h-6 text-[#2a7797]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            List of Projects
          </h2>
        </div>

        {projectsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No current projects
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
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <NewProjectModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onSubmit={handleAddNewProjectSubmit}
        availableClients={AVAILABLE_CLIENTS}
        availableServices={AVAILABLE_SERVICES}
        availableUsers={AVAILABLE_USERS}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedProject?.name || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />

      <EditProjectModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSubmit={(updatedFormValues) => {
          setProjectsList((prev) =>
            prev.map((item) =>
              item.id === selectedProject?.id
                ? { ...item, ...updatedFormValues }
                : item,
            ),
          );
          setIsEditing(false);
        }}
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
      />

      <ComplianceFooter />
    </div>
  );
}
