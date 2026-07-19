"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import TaskModal from "../../components/taskmodal";
import { DashboardBreadcrumbs } from "../../components/dashboardbreadcrumbs"; // Ensure this import path matches your directory structure
import { Task, TaskStatus, TaskPriority } from "../../../types/database";
import {
  Search,
  CheckSquare,
  Edit3,
  Trash2,
  Plus,
  Inbox,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

import { getRowsFromDB, getUsersFromDB, saveDataToDB, deleteDataFromDB, getNameIdFromDB } from "@/lib/supabase";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
];

const FILTER_OPTIONS = [
  { value: "All", label: "All" },
  ...STATUS_OPTIONS,
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// Helper function to format dates to MM/DD/YYYY
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr; // Fallback to raw string if format is unexpected
  const [year, month, day] = parts;
  return `${month}/${day}/${year}`;
};

export default function TasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task;
    direction: "asc" | "desc";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Refs and state for the sliding filter bar mechanism
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [slideStyle, setSlideStyle] = useState({ left: 0, width: 0 });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  const isSidebarOpen = isAdding || isEditing;

  const emptyForm: Omit<Task, "id"> = {
    title: "",
    assignee_id: availableUsers[0]?.id ?? "",
    due_date: "",
    status: "pending",
    priority: "medium",
    linked_project_id: availableProjects[0]?.id ?? "",
  };

  const [formState, setFormState] = useState<Omit<Task, "id">>(emptyForm);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [tasks, projects, users] = await Promise.all([
          getRowsFromDB("task"),
          getNameIdFromDB("project"),
          getUsersFromDB(["team_lead", "team_member"]),
        ]);

        setTasksList(tasks as Task[]);
        setAvailableProjects(projects ?? []);
        setAvailableUsers((users ?? []).map((u: any) => ({ id: u.id, name: u.name })));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setLoadError("Couldn't load tasks. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Breadcrumb Trail Config
  const breadcrumbTrail = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tasks" },
  ];

  useEffect(() => {
    const toggleEvent = new CustomEvent("toggle-dashboard-sidebar", {
      detail: { isOpen: isSidebarOpen },
    });
    window.dispatchEvent(toggleEvent);
  }, [isSidebarOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, itemsPerPage]);

  // Recalculate slider dimensions and offset whenever activeFilter changes
  useEffect(() => {
    if (filterContainerRef.current) {
      const container = filterContainerRef.current;
      const activeButton = container.querySelector(
        `[data-filter="${activeFilter}"]`,
      ) as HTMLButtonElement;

      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        // Calculate position relative to container, accounting for container scroll position
        const relativeLeft =
          buttonRect.left - containerRect.left + container.scrollLeft;

        setSlideStyle({
          left: relativeLeft,
          width: buttonRect.width,
        });
      }
    }
  }, [activeFilter]);

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await saveDataToDB("task", taskId, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
      setTasksList((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task,
        ),
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const updateTaskPriority = async (taskId: string, newPriority: TaskPriority) => {
    try {
      await saveDataToDB("task", taskId, {
        priority: newPriority,
        updated_at: new Date().toISOString(),
      });
      setTasksList((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, priority: newPriority } : task,
        ),
      );
    } catch (error) {
      console.error("Error updating task priority:", error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasksList.filter((task) => {
      if (activeFilter !== "All" && task.status !== activeFilter) return false;
      const assignee = availableUsers.find((u) => u.id === task.assignee_id);
      const project = availableProjects.find((p) => p.id === task.linked_project_id);
      const searchPool = [
        task.title ?? "",
        assignee ? assignee.name : "",
        task.status,
        task.priority,
        task.due_date,
        project ? project.name : "",
      ]
        .join(" ")
        .toLowerCase();
      return searchPool.includes(searchQuery.toLowerCase().trim());
    });
  }, [searchQuery, tasksList, activeFilter, availableUsers, availableProjects]);

  const sortedTasks = useMemo(() => {
    const sortableItems = [...filteredTasks];
    if (sortConfig !== null) {
      const { key, direction } = sortConfig;
      const isAsc = direction === "asc";

      // Define weight weights for Priority mapping: High needs to be first on 'asc'
      const priorityWeights: Record<string, number> = {
        High: 1,
        Medium: 2,
        Low: 3,
      };

      // Define weights for Status mapping: customize order logically (e.g., progression sequence)
      const statusWeights: Record<string, number> = {
        Pending: 1,
        "In-Progress": 2,
        "On Hold": 3,
        Completed: 4,
      };

      sortableItems.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        // 1. Column Rule: Priority Custom Weights
        if (key === "priority") {
          const weightA = priorityWeights[String(valA)] || 99;
          const weightB = priorityWeights[String(valB)] || 99;
          return isAsc ? weightA - weightB : weightB - weightA;
        }

        // 2. Column Rule: Status Custom Weights
        if (key === "status") {
          const weightA = statusWeights[String(valA)] || 99;
          const weightB = statusWeights[String(valB)] || 99;
          return isAsc ? weightA - weightB : weightB - weightA;
        }

        // 3. Column Rule: Due Date Chronological Sort
        if (key === "due_date") {
          const timeA = new Date(String(valA) || 0).getTime();
          const timeB = new Date(String(valB) || 0).getTime();
          return isAsc ? timeA - timeB : timeB - timeA;
        }

        // 4. Fallback Rule: Standard Alphabetical (Task Title, Assignee, etc.)
        const stringA = String(valA).toLowerCase().trim();
        const stringB = String(valB).toLowerCase().trim();

        if (stringA < stringB) return isAsc ? -1 : 1;
        if (stringA > stringB) return isAsc ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTasks, sortConfig]);

  const displayedTasks = useMemo(() => {
    const startOffset = (currentPage - 1) * itemsPerPage;
    return sortedTasks.slice(startOffset, startOffset + itemsPerPage);
  }, [sortedTasks, currentPage, itemsPerPage]);

  const handleSort = (key: keyof Task) => {
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
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId = crypto.randomUUID();
    const newTask: Task = { id: generatedId, ...formState };

    try {
      await saveDataToDB("task", generatedId, formState);
      setTasksList((prev) => [newTask, ...prev]);
    } catch (error) {
      console.error("Error adding task data:", error);
      return;
    }

    setIsAdding(false);
    setFormState(emptyForm);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await saveDataToDB("task", selectedTask.id, formState);
      setTasksList((prev) =>
        prev.map((item) =>
          item.id === selectedTask.id ? { ...item, ...formState } : item,
        ),
      );
    } catch (error) {
      console.error("Error updating task data:", error);
      return;
    }

    setIsEditing(false);
  };
  const handleDeleteRecord = async () => {
    if (!selectedTask) return;
    try {
      await deleteDataFromDB("task", selectedTask.id);
      setTasksList((prev) => prev.filter((item) => item.id !== selectedTask.id));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.log("Error in deleting task", error);
    }
  };

  const getStatusClass = (status: TaskStatus) => {
    const baseClass =
      "text-[10px] font-bold uppercase tracking-wide pl-4 pr-6 py-1 rounded-full border shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 text-center truncate";

    switch (status) {
      case "completed":
        return `${baseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
      case "in_progress":
        return `${baseClass} bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]`;
      case "on_hold":
        return `${baseClass} bg-[#ffebee] text-[#c62828] border-[#ffcdd2]`;
      default: //for pending
        return `${baseClass} bg-[#f5f5f5] text-[#616161] border-[#e0e0e0]`;
    }
  };

  const getPriorityClass = (priority: TaskPriority) => {
    const baseClass =
      "text-[10px] font-bold uppercase tracking-wide pl-4 pr-6 py-1 rounded-full border shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 text-center truncate";

    switch (priority) {
      case "high":
        return `${baseClass} bg-[#ffebee] text-[#c62828] border-[#ffcdd2]`;
      case "medium":
        return `${baseClass} bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]`;
      default: // for low
        return `${baseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
    }
  };

  const columns: Column<Task>[] = [
    {
      key: "title",
      label: "Task Description",
      width: "24%",
      sortable: true,
      render: (t) => (
        <span className="font-bold text-[#11161a] block whitespace-normal break-words leading-snug py-1">
          {t.title}
        </span>
      ),
    },
    {
      key: "linked_project_id",
      label: "Linked Project",
      width: "20%",
      render: (t) => {
        const project = availableProjects.find(
          (p) => p.id === t.linked_project_id,
        );
        return (
          <span
            className="text-slate-600 text-xs font-medium block truncate max-w-full"
            title={project ? project.name : "Unlinked"}
          >
            {project ? project.name : "Unlinked"}
          </span>
        );
      },
    },
    {
      key: "assignee_id",
      label: "Assignee",
      width: "13%",
      render: (t) => {
        const assignee = availableUsers.find((u) => u.id === t.assignee_id);
        return (
          <span
            className="block truncate max-w-full text-xs text-slate-700 font-medium"
            title={assignee ? assignee.name : "Unassigned"}
          >
            {assignee ? assignee.name : "Unassigned"}
          </span>
        );
      },
    },
    {
      key: "priority",
      label: "Priority",
      width: "12%",
      sortable: true,
      render: (t) => (
        <div className="flex items-center justify-center w-full py-1">
          <div className="relative min-w-[105px] max-w-[130px] w-full">
            <select
              value={t.priority}
              onChange={(e) => updateTaskPriority(t.id, e.target.value as TaskPriority)}
              className={getPriorityClass(t.priority)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-slate-900 normal-case"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-current" />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "13%",
      sortable: true,
      render: (t) => (
        <div className="flex items-center justify-center w-full py-1">
          <div className="relative min-w-[115px] max-w-[140px] w-full">
            <select
              value={t.status}
              onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}
              className={getStatusClass(t.status)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-slate-900 normal-case"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60 text-current" />
          </div>
        </div>
      ),
    },
    {
      key: "due_date",
      label: "Due Date",
      width: "13%",
      sortable: true,
      render: (t) => (
        <span className="text-xs text-slate-600 whitespace-nowrap font-medium">
          {/* Formats standard YYYY-MM-DD input to MM/DD/YYYY using the helper */}
          {formatDate(t.due_date) || "-"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "12%",
      render: (t) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedTask(t);
              setFormState({
                title: t.title,
                assignee_id: t.assignee_id,
                due_date: t.due_date,
                status: t.status,
                priority: t.priority,
                linked_project_id: t.linked_project_id,
              });
              setIsEditing(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all duration-200 shadow-sm"
            title="Edit Task"
          >
            <Edit3 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-105" />
            <ChevronRight className="w-3 h-3 opacity-0 max-w-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:max-w-[12px] group-hover/btn:translate-x-0 transition-all duration-200 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTask(t);
              setShowDeleteConfirm(true);
            }}
            className="group/btn flex items-center gap-0.5 px-1.5 py-1 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-all duration-200 shadow-sm"
            title="Delete Task"
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
      className={`space-y-8 mx-auto pb-16 px-4 font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${isSidebarOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
        }`}
    >
      {/* Top Header Controls Area formatted exactly like the landing page */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          {/* Breadcrumbs Wrapper */}
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <DashboardBreadcrumbs items={breadcrumbTrail} />
          </div>

          {/* Main Title formatted with landing page style styling */}
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Tasks for the Week
          </h1>

          {/* Subheader styled to match landing page secondary details */}
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Operational activities schedule · Pipeline execution & manual tasks
            queue
          </p>
        </div>

        {/* Action controls aligned to the right side of the header */}
        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
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
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(null);
              setIsEditing(false);
              setFormState(emptyForm);
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Task
          </button>
        </div>
      </div>

      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#333333]" />
            <h2 className="text-2xl font-bold text-[#333333]">List of Tasks</h2>
          </div>

          {/* Sliding Filter Bar Container */}
          <div
            ref={filterContainerRef}
            className="relative flex items-center bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar max-w-full"
          >
            {/* Sliding Highlight Block */}
            <div
              className="absolute top-1 bottom-1 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100 transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${slideStyle.left}px`,
                width: `${slideStyle.width}px`,
              }}
            />

            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  data-filter={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`relative z-10 px-4 py-1.5 rounded-full text-xs transition-colors duration-300 whitespace-nowrap ${isActive
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            Loading tasks…
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center py-12 text-sm text-red-600">
            {loadError}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No matching tasks discovered
            </span>
          </div>
        ) : (
          <div className="w-full max-w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[720px]">
            <DataTable
              columns={columns}
              data={displayedTasks}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <Pagination
              totalItems={filteredTasks.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isSidebarOpen}
        isAdding={isAdding}
        formState={formState}
        availableProjects={availableProjects}
        availableUsers={availableUsers}
        statusOptions={STATUS_OPTIONS}
        priorityOptions={PRIORITY_OPTIONS}
        onInputChange={handleInputChange}
        onClose={() => {
          setIsAdding(false);
          setIsEditing(false);
          setTimeout(() => setSelectedTask(null), 300);
        }}
        onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
      />

      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedTask?.title || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}
