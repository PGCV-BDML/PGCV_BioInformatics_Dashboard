"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ComplianceFooter from "../../../components/compliancefooter";
import {
  Search,
  Network,
  ChevronLeft,
  Edit3,
  Trash2,
  X,
  Save,
  Link2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
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

export default function ProjectsRegistryClientView({
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

  // ── MODAL CONTEXT MANAGERS ───────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Project | null>(null);

  // ── SEARCH & FILTER LOGIC ───────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) =>
      Object.values(project).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [searchQuery, projectsList]);

  // ── SORTING LOGIC ───────────────────────────────────────────────
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

  // EXPANDED VIEW: Render all sorted projects instead of slicing down to 5
  const displayedProjects = sortedProjects;

  const requestSort = (key: keyof Project) => {
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

  // ── FORM EVENTS ──────────────────────────────────────────────────
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

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteConfirm(true);
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

  const renderSortIcon = (key: keyof Project) => {
    if (!sortConfig || sortConfig.key !== key) {
      return (
        <ChevronUp className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity" />
      );
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#2a7797]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#2a7797]" />
    );
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

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto font-aileron">
      {/* ── TOP ACTION BAR WITH BACK NAVIGATION ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-[#2a7797] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold font-aileron text-[#2a7797] tracking-tight">
            Full Project Registry
          </h1>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search full registry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 outline-none text-[14px] focus:ring-2 focus:ring-[#4ec2bb] transition-all"
          />
        </div>
      </div>

      {/* ── EXPANDED PROJECTS REGISTRY TABLE ─────────────────────────── */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[11px] font-bold text-[#7b7979] tracking-widest uppercase mb-2">
              Master Index ({displayedProjects.length} Records)
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-6 h-6 text-[#2a7797]" />
              <h2 className="text-3xl font-bold text-[#333333]">
                All Registered Projects
              </h2>
            </div>
          </div>
          <span className="hidden sm:inline-block bg-[#eaf7ee] text-[#2e7d32] font-bold text-[10px] tracking-wider px-3 py-1 rounded-full uppercase">
            Complete Ledger View
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="bg-[#f4f6f7] text-[#55656e] text-[13px] font-bold tracking-wide border-b border-gray-200 select-none">
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[20%] group"
                  onClick={() => requestSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    Project Name {renderSortIcon("name")}
                  </div>
                </th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[16%] group"
                  onClick={() => requestSort("client_name")}
                >
                  <div className="flex items-center gap-1.5">
                    Client {renderSortIcon("client_name")}
                  </div>
                </th>
                <th className="py-4 px-4 w-[14%]">Service Type</th>
                <th className="py-4 px-4 w-[12%]">Status</th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[12%] group"
                  onClick={() => requestSort("lead")}
                >
                  <div className="flex items-center gap-1.5">
                    Lead {renderSortIcon("lead")}
                  </div>
                </th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[13%] group"
                  onClick={() => requestSort("start_date")}
                >
                  <div className="flex items-center gap-1.5">
                    Start Date {renderSortIcon("start_date")}
                  </div>
                </th>
                <th
                  className="py-4 px-4 cursor-pointer hover:bg-[#e9ecef] w-[13%] group"
                  onClick={() => requestSort("target_delivery_date")}
                >
                  <div className="flex items-center gap-1.5">
                    Target Delivery {renderSortIcon("target_delivery_date")}
                  </div>
                </th>
                <th
                  className="py-4 px-4 text-center w-[10%]"
                  style={{ width: "90px" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-[#2c3a42]">
              {displayedProjects.map((project) => (
                <tr
                  key={project.id}
                  className="odd:bg-[#f9fafb] even:bg-white border-b border-gray-200/40 last:border-b-0 text-[#2c3a42] hover:bg-gray-100/70 transition-colors"
                >
                  <td className="py-4 px-4 font-bold text-[#11161a] break-words">
                    {project.name}
                  </td>
                  <td className="py-4 px-4 text-[#38454f] font-medium break-words">
                    {project.client_name}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-0.5 bg-[#f0f2f3] text-[#4a5963] rounded-full text-[12px] font-bold inline-block break-words">
                      {project.service_type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {renderStatusBadge(project.status)}
                  </td>
                  <td className="py-4 px-4 text-[#4a5963] break-words">
                    {project.lead}
                  </td>
                  <td className="py-4 px-4 text-[#4a5963] font-medium">
                    {project.start_date || "—"}
                  </td>
                  <td className="py-4 px-4 text-[#4a5963] font-medium">
                    {project.target_delivery_date || "—"}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(project)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-[#2a7797] transition-colors"
                        title="Edit Project"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(project)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr className="bg-white">
                  <td
                    colSpan={8}
                    className="text-center py-12 text-gray-400 font-medium"
                  >
                    No projects found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODALS LAYER ────────────────────────────────────────────── */}
      {isEditing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={closeModals}
        >
          <div
            className="bg-[#fffdf8] rounded-[28px] max-w-[640px] w-full p-8 shadow-xl border border-gray-100 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModals}
              className="absolute top-6 right-6 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleSaveChanges} className="space-y-5">
              <div>
                <p className="text-[11px] font-bold text-[#7b7979] tracking-widest uppercase mb-1">
                  Configuration Form
                </p>
                <h3 className="text-2xl font-bold text-[#333333]">
                  Update Record Parameters
                </h3>
              </div>
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
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={closeModals}
        >
          <div
            className="bg-[#fffdf8] rounded-[24px] max-w-[440px] w-full p-6 shadow-xl border border-gray-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-lg font-bold">Confirm Record Removal</h4>
            </div>
            <p className="text-sm text-gray-500">
              Are you absolutely certain you want to purge{" "}
              <strong>{selectedProject.name}</strong>? This dashboard view index
              row update cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={closeModals}
                className="h-10 px-4 bg-gray-100 rounded-xl font-bold text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRecord}
                className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ComplianceFooter />
    </div>
  );
}
