"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import EditModal from "../../components/editmodal";
import {
  Search,
  Network,
  ListFilter,
  Edit3,
  Trash2,
  Save,
  Link2,
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

export default function ProjectsClientView({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [projectsList, setProjectsList] = useState<Project[]>(initialProjects);
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

  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) =>
      Object.values(project).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [searchQuery, projectsList]);

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

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setEditForm({
      ...project,
      start_date: project.start_date || "",
      target_delivery_date: project.target_delivery_date || "",
      repository_link: project.repository_link || "",
    });
    setIsEditing(true);
  };

  const closeModals = () => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSelectedProject(null);
    setEditForm(null);
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
    closeModals();
  };

  const handleDeleteRecord = () => {
    if (!selectedProject) return;
    setProjectsList((prev) =>
      prev.filter((item) => item.id !== selectedProject.id),
    );
    closeModals();
  };

  const renderStatusBadge = (status: string) => {
    const baseClass =
      "px-2.5 py-1 rounded-full text-[10px] font-bold font-aileron text-center min-w-[92px] inline-block tracking-wide uppercase";
    switch (status) {
      case "Completed":
        return (
          <span className={`${baseClass} bg-[#eaf7ee] text-[#2e7d32]`}>
            Completed
          </span>
        );
      case "On-going":
      case "In-progress":
        return (
          <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
            In-Progress
          </span>
        );
      case "On hold":
      case "Overdue":
        return (
          <span className={`${baseClass} bg-[#ffebee] text-[#c62828]`}>
            Overdue
          </span>
        );
      case "Submitted":
        return (
          <span className={`${baseClass} bg-[#f5f5f5] text-[#616161]`}>
            Submitted
          </span>
        );
      case "For approval":
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
    {
      key: "start_date",
      label: "Start Date",
      width: "13%",
      sortable: true,
      render: (p) => <span>{p.start_date || "—"}</span>,
    },
    {
      key: "target_delivery_date",
      label: "Target Delivery",
      width: "13%",
      sortable: true,
      render: (p) => <span>{p.target_delivery_date || "—"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      width: "10%",
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => openEditModal(p)}
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-[#2a7797] transition-colors"
            title="Edit Project"
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
            title="Delete Project"
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
        <h1 className="text-4xl font-bold font-aileron text-[#2a7797] tracking-tight">
          Projects
        </h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 outline-none text-[14px] focus:ring-2 focus:ring-[#4ec2bb] transition-all"
          />
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[11px] font-bold text-[#7b7979] tracking-widest uppercase mb-2">
              Projects Tracker
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-6 h-6 text-[#2a7797]" />
              <h2 className="text-3xl font-bold text-[#333333]">
                List of Projects
              </h2>
            </div>
          </div>
          <span className="hidden sm:inline-block bg-gray-100 text-[#55656e] font-bold text-[10px] tracking-wider px-3 py-1 rounded-full uppercase">
            Internal and Service-Linked Work
          </span>
        </div>

        <DataTable
          columns={columns}
          data={displayedProjects}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage="No active projects found matching your filters."
        />
        <Pagination
          totalItems={filteredProjects.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        <div className="mt-5 flex justify-end relative z-10">
          <Link
            href="/dashboard/projects/registry"
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-bold text-[13px] text-[#2a7797] shadow-sm transition-all"
          >
            <ListFilter className="w-4 h-4" /> View Full Registry Table (
            {projectsList.length} total)
          </Link>
        </div>
      </div>

      {/* REUSABLE DELETE MODAL COMPONENT */}
      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedProject?.name || ""}
        onClose={closeModals}
        onConfirm={handleDeleteRecord}
      />

      {/* REUSABLE EDIT MODAL COMPONENT */}
      <EditModal
        isOpen={isEditing}
        onClose={closeModals}
        title="Update Record Parameters"
        subtitle="Configuration Form"
      >
        {editForm && (
          <form onSubmit={handleSaveChanges} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Client
                </label>
                <input
                  type="text"
                  name="client_name"
                  required
                  value={editForm.client_name}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Service Type
                </label>
                <input
                  type="text"
                  name="service_type"
                  required
                  value={editForm.service_type}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Pipeline Status
                </label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                >
                  <option value="On-going">On-going / In-Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On hold">On hold / Overdue</option>
                  <option value="Submitted">Submitted</option>
                  <option value="For approval">For approval</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Lead Coordinator
                </label>
                <input
                  type="text"
                  name="lead"
                  required
                  value={editForm.lead}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={editForm.start_date}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-[#172126]">
                  Target Delivery
                </label>
                <input
                  type="date"
                  name="target_delivery_date"
                  value={editForm.target_delivery_date}
                  onChange={handleInputChange}
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
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
                  className="h-10 px-3 bg-white rounded-xl border border-gray-200 outline-none text-xs focus:ring-2 focus:ring-[#4ec2bb]"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={closeModals}
                className="h-11 px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 h-11 px-5 bg-[#4ec2bb] hover:bg-[#3fb0a9] text-white font-bold text-sm rounded-xl shadow-md"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        )}
      </EditModal>

      {/* Guide reference layout holds constant below */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.08)] rounded-[28px] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-[11px] font-bold tracking-[1.5px] uppercase font-aileron text-[#7b7979]">
              Required Fields Guide
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Reference blueprint layout for clients lodging submission
              workflows.
            </p>
          </div>
          <span className="bg-gray-100 text-[#7b7979] font-bold text-[10px] tracking-wider px-3 py-1 rounded-full uppercase">
            Review with biology track
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              label: "Project Name",
              desc: "Descriptive title of work assignment",
            },
            {
              label: "Client",
              desc: "Origin organization, university or lab unit",
            },
            {
              label: "Service Type",
              desc: "Bioinformatics analysis branch requested",
            },
            { label: "Status", desc: "Pipeline tracking position flag" },
            {
              label: "Lead",
              desc: "Assigned head supervisor processing parameters",
            },
            {
              label: "Target Delivery",
              desc: "Estimated delivery pipeline threshold date",
            },
          ].map((field, i) => (
            <div
              key={i}
              className="bg-[#fffdf8] rounded-2xl border border-gray-200/60 p-4 flex flex-col justify-center"
            >
              <span className="text-sm font-bold text-[#172126]">
                {field.label}
              </span>
              <span className="text-xs text-gray-400 mt-1">{field.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <ComplianceFooter />
    </div>
  );
}
