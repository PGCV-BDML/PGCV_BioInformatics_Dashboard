"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTableState } from "@/hooks/useTableState";
import { useDeleteRecord } from "@/hooks/useDeleteRecord";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { useToast } from "../../components/toast";
import Link from "next/link";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import TaskModal from "../../components/taskmodal";
import { PageHeader } from "../../components/pageheader";
import { Task, TaskStatus, TaskPriority, User } from "../../../types/database";
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

import { getRowsFromDB, getUsersFromDB, saveDataToDB, getNameIdFromDB } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { tasksBreadcrumbs } from "@/lib/breadcrumbs";

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



export default function TasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // ponytail: naming inconsistency — consider standardizing to isPanelOpen pattern
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs and state for the sliding filter bar mechanism
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [slideStyle, setSlideStyle] = useState({ left: 0, width: 0 });

  const isSidebarOpen = isAdding || isEditing;

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const deleteRecord = useDeleteRecord<Task>("task", setTasksList, (err) =>
    showToast("Failed to delete task.", "error"),
  );

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
        setAvailableUsers((users ?? []).map((u: User) => ({ id: u.id, name: u.name })));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setLoadError("Couldn't load tasks. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    toggleSidebar(isSidebarOpen);
  }, [isSidebarOpen, toggleSidebar]);

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
    const previous = tasksList.find((t) => t.id === taskId)?.status;
    // Optimistic update — set state before the network round-trip
    setTasksList((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t,
      ),
    );
    try {
      await saveDataToDB("task", taskId, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      // Rollback on failure
      setTasksList((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: previous ?? t.status } : t,
        ),
      );
      showToast("Failed to update status. Reverting.", "error");
    }
  };

  const updateTaskPriority = async (taskId: string, newPriority: TaskPriority) => {
    const previous = tasksList.find((t) => t.id === taskId)?.priority;
    // Optimistic update
    setTasksList((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, priority: newPriority, updated_at: new Date().toISOString() } : t,
      ),
    );
    try {
      await saveDataToDB("task", taskId, {
        priority: newPriority,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating task priority:", error);
      // Rollback on failure
      setTasksList((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, priority: previous ?? t.priority } : t,
        ),
      );
      showToast("Failed to update priority. Reverting.", "error");
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

  const { 
    sortConfig, 
    handleSort, 
    sorted: sortedTasks,
    displayed: displayedTasks,
    currentPage, 
    setCurrentPage,
  } = useTableState<Task>({
    items: filteredTasks,
    itemsPerPage,
    resetKey: `${searchQuery}-${activeFilter}`,
    customSorters: {
      priority: (a, b) => {
        const priorityWeights: Record<string, number> = {
          high: 1, medium: 2, low: 3,
        };
        return (priorityWeights[String(a.priority)] || 99) - (priorityWeights[String(b.priority)] || 99);
      },
      status: (a, b) => {
        const statusWeights: Record<string, number> = {
          pending: 1, in_progress: 2, on_hold: 3, completed: 4,
        };
        return (statusWeights[String(a.status)] || 99) - (statusWeights[String(b.status)] || 99);
      },
      due_date: (a, b) => {
        const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return timeA - timeB;
      },
    },
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // prevent double-submit
    setIsSubmitting(true);

    const generatedId = crypto.randomUUID();
    const newTask: Task = { id: generatedId, ...formState };

    try {
      await saveDataToDB("task", generatedId, formState);
      setTasksList((prev) => [newTask, ...prev]);
      showToast("Task created successfully.", "success");
    } catch (error) {
      showToast("Failed to save task. Please try again.", "error");
      return;
    } finally {
      setIsSubmitting(false);
    }

    setIsAdding(false);
    setFormState(emptyForm);
  }, [formState, emptyForm, showToast, isSubmitting]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (isSubmitting) return; // prevent double-submit
    setIsSubmitting(true);

    try {
      await saveDataToDB("task", selectedTask.id, formState);
      setTasksList((prev) =>
        prev.map((item) =>
          item.id === selectedTask.id ? { ...item, ...formState } : item,
        ),
      );
      showToast("Task updated successfully.", "success");
    } catch (error) {
      showToast("Failed to update task.", "error");
      return;
    } finally {
      setIsSubmitting(false);
    }

    setIsEditing(false);
  }, [formState, selectedTask, showToast, isSubmitting]);
  const handleDeleteRecord = useCallback(() => {
    if (!selectedTask) return;
    deleteRecord(selectedTask, () => {
      setShowDeleteConfirm(false);
      showToast("Task deleted.", "success");
    });
  }, [selectedTask, deleteRecord, showToast]);

  const handleCloseTaskModal = useCallback(() => {
    setIsAdding(false);
    setIsEditing(false);
  }, []);

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
      <PageHeader
        breadcrumbTrail={tasksBreadcrumbs}
        title="Tasks for the Week"
        subtitle="Operational activities schedule · Pipeline execution & manual tasks queue"
        actions={
          <>
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
          </>
        }
      />

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
        isSaving={isSubmitting}
        formState={formState}
        availableProjects={availableProjects}
        availableUsers={availableUsers}
        statusOptions={STATUS_OPTIONS}
        priorityOptions={PRIORITY_OPTIONS}
        onInputChange={handleInputChange}
        onClose={handleCloseTaskModal}
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
