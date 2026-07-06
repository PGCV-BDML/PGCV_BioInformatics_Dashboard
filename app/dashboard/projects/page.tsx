"use client";

import { useState, useMemo } from "react";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import EditModal from "../../components/editmodal";
import { Search, Network, Edit3, Trash2, Save, Link2 } from "lucide-react";

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
  const [projectsList, setProjectsList] = useState<Project[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Project;
    direction: "asc" | "desc";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useMemo(() => {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (editForm) {
      setEditForm({ ...editForm, [e.target.name]: e.target.value });
    }
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    setProjectsList((prev) =>
      prev.map((item) => (item.id === editForm.id ? editForm : item)),
    );
    setIsEditing(false);
  };

  const handleDeleteRecord = () => {
    if (!selectedProject) return;
    setProjectsList((prev) =>
      prev.filter((item) => item.id !== selectedProject.id),
    );
    setShowDeleteConfirm(false);
  };

  // Safe case-insensitive color badge lookup
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
              setEditForm({
                ...p,
                repository_link: p.repository_link || "",
              });
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Projects
        </h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-[14px] outline-none focus:ring-2 focus:ring-[#4ec2bb]"
          />
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Network className="w-6 h-6 text-[#2a7797]" />
          <h2 className="text-3xl font-bold text-[#333333]">
            Project Tracking Workspace
          </h2>
        </div>

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

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedProject?.name || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />

      <EditModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Update Record Parameters"
        subtitle="Configuration Form"
      >
        {editForm && (
          <form onSubmit={handleSaveChanges} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project Name */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[12px] font-bold text-[#172126]">
                  Project Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={editForm.name}
                  onChange={handleInputChange}
                  className="h-10 px-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>

              {/* Client Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Client
                </label>
                <select
                  name="client_name"
                  required
                  value={editForm.client_name}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                >
                  {AVAILABLE_CLIENTS.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Service Type
                </label>
                <select
                  name="service_type"
                  required
                  value={editForm.service_type}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                >
                  {AVAILABLE_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Pipeline Status
                </label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                >
                  <option value="On-going">On-going</option>
                  <option value="Completed">Completed</option>
                  <option value="On hold">On hold</option>
                  <option value="Submitted">Submitted</option>
                  <option value="For approval">For approval</option>
                </select>
              </div>

              {/* Lead Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Lead Coordinator
                </label>
                <select
                  name="lead"
                  required
                  value={editForm.lead}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                >
                  {AVAILABLE_USERS.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={editForm.start_date}
                  onChange={handleInputChange}
                  className="h-10 px-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>

              {/* Target Delivery Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Target Delivery
                </label>
                <input
                  type="date"
                  name="target_delivery_date"
                  value={editForm.target_delivery_date}
                  onChange={handleInputChange}
                  className="h-10 px-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>

              {/* Repository Link */}
              <div className="flex flex-col gap-1 sm:col-span-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#2a7797]" />
                  <label className="text-[12px] font-bold text-[#172126]">
                    Linked Repository Link
                  </label>
                </div>
                <input
                  type="url"
                  name="repository_link"
                  placeholder="https://github.com/..."
                  value={editForm.repository_link}
                  onChange={handleInputChange}
                  className="h-10 px-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-11 px-5 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 h-11 px-5 bg-[#4ec2bb] text-white font-bold text-sm rounded-xl shadow-md"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        )}
      </EditModal>

      <ComplianceFooter />
    </div>
  );
}
