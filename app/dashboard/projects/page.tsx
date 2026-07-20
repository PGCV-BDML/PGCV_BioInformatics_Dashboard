"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import ProjectModal from "../../components/projectmodal";
import { UserOption, Project, ProjectFormData, ProjectStatus, STATUS_OPTIONS } from "../../../types/database";
import { PageHeader } from "../../components/pageheader";
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
import { getRowsFromDB, getUsersFromDB, saveDataToDB, getNameIdFromDB } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { projectsBreadcrumbs } from "@/lib/breadcrumbs";
import { useTableState } from "@/hooks/useTableState";
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";

const FILTER_OPTIONS: { value: ProjectStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  ...STATUS_OPTIONS,
];


export default function ProjectsPage() {
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [availableClients, setAvailableClients] = useState<UserOption[]>([]);
  const [availableServices, setAvailableServices] = useState<UserOption[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "All">("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // ponytail: naming inconsistency — consider standardizing to isPanelOpen pattern
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPanelOpen = isAdding || isEditing;

  const activeFilterIndex = useMemo(() => {
    return FILTER_OPTIONS.findIndex((opt) => opt.value === activeFilter);
  }, [activeFilter]);

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

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  useEffect(() => {
    toggleSidebar(isPanelOpen);
  }, [isPanelOpen, toggleSidebar]);

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

  const updateProjectService = async (projectId: string, newServiceId: string) => {
    const previous = projectsList.find((p) => p.id === projectId)?.service_id;
    setProjectsList((prev) =>
      prev.map((proj) =>
        proj.id === projectId ? { ...proj, service_id: newServiceId } : proj,
      ),
    );
    try {
      await saveDataToDB("project", projectId, { service_id: newServiceId });
    } catch (error) {
      console.error("Failed to update project service:", error);
      // Rollback the frontend update on DB failure
      setProjectsList((prev) =>
        prev.map((proj) =>
          proj.id === projectId && previous !== undefined
            ? { ...proj, service_id: previous }
            : proj,
        ),
      );
      showToast("Failed to update service. Reverting.", "error");
    }
  };

  const handleAddSubmit = useCallback(async (formData: ProjectFormData) => {
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
      showToast("Project created successfully.", "success");
    } catch (error) {
      showToast("Failed to save project. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  const handleEditSubmit = useCallback(async (formData: ProjectFormData) => {
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
      showToast("Project updated successfully.", "success");
    } catch (error) {
      showToast("Failed to update project.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [selectedProject, showToast]);

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
  }, []);

  const initialData = useMemo(() => {
    if (!selectedProject) return null;
    return {
      name: selectedProject.name,
      client_id: selectedProject.client_id,
      service_id: selectedProject.service_id,
      status: selectedProject.status,
      lead_user_id: selectedProject.lead_user_id,
      start_date: selectedProject.start_date,
      target_delivery_date: selectedProject.target_delivery_date || "",
      repository_link: selectedProject.repository_link || "",
    };
  }, [selectedProject]);

  const deleteRecord = useDeleteRecord<Project>("project", setProjectsList, (err) =>
    showToast("Failed to delete project.", "error"),
  );
  const handleDeleteRecord = useCallback(async () => {
    if (!selectedProject) return;
    setIsDeleting(true);
    try {
      await deleteRecord(selectedProject, () => {
        setShowDeleteConfirm(false);
        showToast("Project deleted.", "success");
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedProject, deleteRecord, showToast]);

  const filteredProjects = useMemo(() => {
    let records = projectsList;

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

  const {
    sortConfig,
    handleSort,
    sorted: sortedProjects,
    displayed: displayedProjects,
    currentPage,
    setCurrentPage,
  } = useTableState<Project>({
    items: filteredProjects,
    itemsPerPage,
    resetKey: `${searchQuery}-${activeFilter}`,
  });

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
      sortable: true,
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
      className={`space-y-8 mx-auto font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${isPanelOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
        }`}
    >
      <PageHeader
        breadcrumbTrail={projectsBreadcrumbs}
        title="Projects"
        subtitle="Operational workflows · Manage genomic execution matrices and project pipelines"
        actions={
          <>
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
              disabled={optionsLoading}
              onClick={() => {
                setSelectedProject(null);
                setIsAdding(true);
              }}
              className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Project
            </button>
          </>
        }
      />

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
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`relative z-10 w-28 py-1.5 rounded-full text-xs text-center transition-colors duration-300 whitespace-nowrap select-none ${isActive
                    ? "text-[#2a7797] font-semibold"
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
        isSaving={isSaving}
        initialData={initialData}
        availableClients={availableClients}
        availableServices={availableServices}
        availableUsers={availableUsers}
        onClose={handleCloseModal}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedProject?.name || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
        isDeleting={isDeleting}
      />
    </div>
  );
}
