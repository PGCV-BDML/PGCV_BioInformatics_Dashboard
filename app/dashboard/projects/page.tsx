"use client";

import { useState, useMemo, useEffect } from "react";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import ProjectModal from "../../components/projectmodal";
import { UserOption, Project, ProjectFormData, ProjectStatus, STATUS_OPTIONS } from "../../../types/database";
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

//Database imports
import { getRowsFromDB, getUsersFromDB, saveDataToDB, deleteDataFromDB, getNameIdFromDB } from "@/lib/supabase";

// These would normally come from your DB (clients/services/users tables)
// const AVAILABLE_CLIENTS: UserOption[] = await getNameIdFromDB("client")
// const AVAILABLE_SERVICES: UserOption[] = await getNameIdFromDB("service")
// const AVAILABLE_USERS: UserOption[] = await getUsersFromDB(["team_lead", "team_member"])

const FILTER_OPTIONS: { value: ProjectStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...STATUS_OPTIONS,
];

// types/database.ts (or a shared constants file)


export default function ProjectsPage() {
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [availableClients, setAvailableClients] = useState<UserOption[]>([]);
  const [availableServices, setAvailableServices] = useState<UserOption[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "All">("All");
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
  const [isSaving, setIsSaving] = useState(false);

  const isPanelOpen = isAdding || isEditing;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const [clients, services, users, rows] = await Promise.all([
          getNameIdFromDB("client"),
          getNameIdFromDB("service"),
          getUsersFromDB(["team_lead", "team_member"]),
          getRowsFromDB("project"),
        ]);

        if (cancelled) return;
        setAvailableClients(clients as UserOption[]);
        setAvailableServices(services as UserOption[]);
        setAvailableUsers(users as UserOption[]);
        setProjectsList(rows as Project[]);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (!cancelled) {
          setOptionsError(
            "Couldn't load clients, services, or team members. Please refresh the page.",
          );
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Lookup maps so the table can resolve id -> display name ---
  const clientMap = useMemo(
    () => Object.fromEntries(availableClients.map((c) => [c.id, c.name])),
    [availableClients],
  );
  const serviceMap = useMemo(
    () => Object.fromEntries(availableServices.map((s) => [s.id, s.name])),
    [availableServices],
  );
  const userMap = useMemo(
    () => Object.fromEntries(availableUsers.map((u) => [u.id, u.name])),
    [availableUsers],
  );

  useEffect(() => {
    (async () => {
      try {
        const rows = await getRowsFromDB("project"); // adjust to actual signature
        setProjectsList(rows as Project[]);
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    })();
  }, []);

  useEffect(() => {
    const toggleEvent = new CustomEvent("toggle-dashboard-sidebar", {
      detail: { isOpen: isPanelOpen },
    });
    window.dispatchEvent(toggleEvent);
  }, [isPanelOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, itemsPerPage]);

  const updateProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    const previous = projectsList.find((p) => p.id === projectId)?.status;

    // Update the frontend immediately
    setProjectsList((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, status: newStatus } : proj,
      ),
    );

    try {
      await saveDataToDB("project", projectId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
      // Rollback the frontend update if error occurs when saving to the database
      setProjectsList((prev) =>
        prev.map((proj) =>
          proj.id === projectId && previous !== undefined
            ? { ...proj, status: previous }
            : proj,
        ),
      );
    }
  };

  const updateProjectService = (projectId: string, newServiceId: string) => {
    setProjectsList((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, service_id: newServiceId } : proj,
      ),
    );
    saveDataToDB("project", projectId, { service_id: newServiceId }).catch((error) =>
      console.error("Failed to update service:", error),
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

  const handleAddSubmit = async (formData: ProjectFormData) => {
    const newId = crypto.randomUUID();
    const payload = {
      id: newId,
      name: formData.name,
      client_id: formData.client_id,
      service_id: formData.service_id,
      status: formData.status,
      lead_user_id: formData.lead_user_id,
      start_date: formData.start_date,
      target_delivery_date: formData.target_delivery_date || null,
      repository_link: formData.repository_link || null,
    };

    setIsSaving(true);

    try {
      const saved = await saveDataToDB("project", newId, payload);
      setProjectsList((prev) => [saved, ...prev]);
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to save new project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (formData: ProjectFormData) => {
    if (!selectedProject) return;

    const payload = {
      name: formData.name,
      client_id: formData.client_id,
      service_id: formData.service_id,
      status: formData.status,
      lead_user_id: formData.lead_user_id,
      start_date: formData.start_date,
      target_delivery_date: formData.target_delivery_date || null,
      repository_link: formData.repository_link || null,
    };

    setIsSaving(true);
    try {
      const saved = await saveDataToDB("project", selectedProject.id, payload);
      setProjectsList((prev) =>
        prev.map((item) => (item.id === selectedProject.id ? { ...item, ...(saved as Project) } : item)),
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedProject) return;
    try {
      await deleteDataFromDB("project", selectedProject.id);
      setProjectsList((prev) =>
        prev.filter((item) => item.id !== selectedProject.id),
      );
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const filteredProjects = useMemo(() => {
    let records = projectsList;

    // Apply Active Horizontal Capsule Filter
    if (activeFilter !== "All") {
      records = records.filter((project) => project.status === activeFilter);
    }

    const cleansedQuery = searchQuery.toLowerCase().trim();
    if (!cleansedQuery) return records;

    return records.filter((project) => {
      const searchable = {
        ...project,
        client_name: clientMap[project.client_id] ?? "",
        service_name: serviceMap[project.service_id] ?? "",
        lead_name: userMap[project.lead_user_id] ?? "",
      };
      return Object.values(searchable).some((v) =>
        String(v ?? "").toLowerCase().includes(cleansedQuery),
      );
    });
  }, [searchQuery, projectsList, activeFilter, clientMap, serviceMap, userMap]);

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

  const getStatusClass = (status: ProjectStatus) => {
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
      key: "client_id",
      label: "Client",
      width: "13%",
      sortable: true,
      render: (p) => <span className="block">{clientMap[p.client_id] ?? "Unknown"}</span>,
    },
    {
      key: "service_id",
      label: "Service Category",
      width: "13%",
      render: (p) => (
        <div className="relative block w-full whitespace-normal break-words">
          <select
            value={p.service_id}
            onChange={(e) => updateProjectService(p.id, e.target.value)}
            className="w-full text-[10px] font-bold pl-2 pr-6 py-1 bg-[#f0f2f3] text-[#4a5963] border border-gray-200/50 rounded-xl block shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 whitespace-normal break-words leading-tight"
          >
            {availableServices.map((srv) => (
              <option
                key={srv.id}
                value={srv.id}
                className="bg-white text-slate-900 font-normal normal-case"
              >
                {srv.name}
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
      render: (p) => (
        <div className="relative inline-block w-full min-w-[95px]">
          <select
            value={p.status}
            onChange={(e) => updateProjectStatus(p.id, e.target.value as ProjectStatus)}
            className={getStatusClass(p.status)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-white text-slate-900 font-normal normal-case"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-current" />
        </div>
      ),
    },
    {
      key: "lead_user_id",
      label: "Lead",
      width: "10%",
      sortable: true,
      render: (p) => <span>{userMap[p.lead_user_id] ?? "Unassigned"}</span>,
    },
    {
      key: "start_date",
      label: "Start Date",
      width: "9%",
      sortable: true,
      render: (p) => (
        <span className="text-xs text-slate-600">{p.start_date}</span>
      ),
    },
    {
      key: "target_delivery_date",
      label: "Delivery Date",
      width: "9%",
      sortable: true,
      render: (p) => (
        <span className="text-xs text-slate-600">{p.target_delivery_date}</span>
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
      className={`space-y-6 mx-auto font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
        }`}
    >
      {/* Control Navigation Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Projects
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            Projects
          </h1>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full md:w-auto">
          {/* Row Limit Control Switcher */}
          <div className="relative flex items-center bg-[#fffdf8] rounded-full border border-gray-200 px-3 h-10 shadow-sm">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-transparent text-xs text-slate-700 outline-none pr-1 cursor-pointer font-medium appearance-none"
            >
              <option value={5}>Show 5 rows</option>
              <option value={7}>Show 7 rows</option>
              <option value={10}>Show 10 rows</option>
              <option value={20}>Show 20 rows</option>
            </select>
          </div>

          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus:shadow-[0_4px_16px_rgba(78,194,187,0.15)] transition-all"
            />
          </div>
          <button
            type="button"
            disabled={optionsLoading}
            onClick={() => {
              setSelectedProject(null);
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Project
          </button>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">
              List of Projects
            </h2>
          </div>

          {/* New Cream Filter Bar Capsule matching your design image */}
          <div className="flex items-center gap-1 bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar max-w-full">
            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all duration-200 whitespace-nowrap ${isActive
                    ? "bg-white text-[#2a7797] font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {optionsError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-red-50/50 rounded-2xl border border-dashed border-red-200 p-6">
            <span className="text-sm font-medium text-red-500">{optionsError}</span>
          </div>
        ) : optionsLoading ? (
          <div className="flex items-center justify-center py-12 text-sm font-medium text-slate-400">
            Loading projects…
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No matching projects discovered
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[760px]">
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
        isSaving={isSaving}
        initialData={
          selectedProject
            ? {
              name: selectedProject.name,
              client_id: selectedProject.client_id,
              service_id: selectedProject.service_id,
              status: selectedProject.status,
              lead_user_id: selectedProject.lead_user_id,
              start_date: selectedProject.start_date,
              target_delivery_date: selectedProject.target_delivery_date || "",
              repository_link: selectedProject.repository_link || "",
            }
            : null
        }
        availableClients={availableClients}
        availableServices={availableServices}
        availableUsers={availableUsers}
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
