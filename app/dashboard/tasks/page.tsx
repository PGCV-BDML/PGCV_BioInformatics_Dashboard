"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import TaskModal from "../../components/taskmodal";
import {
  ArrowLeft,
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

type Task = {
  id: number;
  title: string;
  assignee: string;
  due_date: string;
  status: string;
  priority: string;
  project_id: number;
};

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "Configure multi-node SLURM job matrix parameters",
    assignee: "Dr. Analyst Cruz",
    due_date: "2026-07-15",
    status: "In-Progress",
    priority: "High",
    project_id: 1,
  },
  {
    id: 2,
    title: "Verify fastq adapter filtering thresholds via MultiQC reports",
    assignee: "Prof. Lopez",
    due_date: "2026-07-22",
    status: "Pending",
    priority: "Medium",
    project_id: 2,
  },
  {
    id: 3,
    title: "Deploy downstream R Shiny expression rendering visualization app",
    assignee: "Engr. Santos",
    due_date: "2026-08-05",
    status: "Completed",
    priority: "Low",
    project_id: 4,
  },
];

const AVAILABLE_PROJECTS = [
  { id: 1, name: "De Novo Transcriptome Assembly Pipeline" },
  { id: 2, name: "Metagenomic Sequencing Validation" },
  { id: 3, name: "Variant Calling on Rice Subspecies" },
  { id: 4, name: "RNA-Seq Differential Expression Analysis" },
  { id: 5, name: "ChIP-Seq Transcription Profiling" },
];

const AVAILABLE_USERS = [
  "Dr. Analyst Cruz",
  "Prof. Lopez",
  "Engr. Santos",
  "Dr. Cruz",
  "Prof. Torres",
];

const STATUS_OPTIONS = ["Pending", "In-Progress", "Completed", "On Hold"];
const FILTER_OPTIONS = ["All", ...STATUS_OPTIONS];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];

export default function TasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>(INITIAL_TASKS);
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

  const isSidebarOpen = isAdding || isEditing;

  const emptyForm: Omit<Task, "id"> = {
    title: "",
    assignee: AVAILABLE_USERS[0],
    due_date: "",
    status: "Pending",
    priority: "Medium",
    project_id: AVAILABLE_PROJECTS[0].id,
  };

  const [formState, setFormState] = useState<Omit<Task, "id">>(emptyForm);

  useEffect(() => {
    const toggleEvent = new CustomEvent("toggle-dashboard-sidebar", {
      detail: { isOpen: isSidebarOpen },
    });
    window.dispatchEvent(toggleEvent);
  }, [isSidebarOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, itemsPerPage]);

  const updateTaskStatus = (taskId: number, newStatus: string) => {
    setTasksList((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      ),
    );
  };

  const updateTaskPriority = (taskId: number, newPriority: string) => {
    setTasksList((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, priority: newPriority } : task,
      ),
    );
  };

  const filteredTasks = useMemo(() => {
    return tasksList.filter((task) => {
      if (activeFilter !== "All") {
        const normalizedTaskStatus = (task.status || "")
          .toLowerCase()
          .replace(/[\s-]/g, "");
        const normalizedFilter = activeFilter
          .toLowerCase()
          .replace(/[\s-]/g, "");
        if (normalizedTaskStatus !== normalizedFilter) return false;
      }

      const project = AVAILABLE_PROJECTS.find((p) => p.id === task.project_id);
      const searchPool = [
        task.title,
        task.assignee,
        task.status,
        task.priority,
        task.due_date,
        project ? project.name : "",
      ]
        .join(" ")
        .toLowerCase();
      return searchPool.includes(searchQuery.toLowerCase().trim());
    });
  }, [searchQuery, tasksList, activeFilter]);

  const sortedTasks = useMemo(() => {
    const sortableItems = [...filteredTasks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
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
    setFormState((prev) => ({
      ...prev,
      [name]: name === "project_id" ? parseInt(value, 10) : value,
    }));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId =
      tasksList.length > 0 ? Math.max(...tasksList.map((t) => t.id)) + 1 : 1;

    setTasksList((prev) => [{ id: generatedId, ...formState }, ...prev]);
    setIsAdding(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setTasksList((prev) =>
      prev.map((item) =>
        item.id === selectedTask.id ? { ...item, ...formState } : item,
      ),
    );
    setIsEditing(false);
  };

  const handleDeleteRecord = () => {
    if (!selectedTask) return;
    setTasksList((prev) => prev.filter((item) => item.id !== selectedTask.id));
    setShowDeleteConfirm(false);
  };

  const getStatusClass = (status: string) => {
    const baseClass =
      "text-[10px] font-bold uppercase tracking-wide pl-4 pr-6 py-1 rounded-full border shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 text-center truncate";
    const normal = status.toLowerCase().replace(/[\s-]/g, "");

    if (normal === "completed") {
      return `${baseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
    }
    if (normal === "inprogress") {
      return `${baseClass} bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]`;
    }
    if (normal === "onhold") {
      return `${baseClass} bg-[#ffebee] text-[#c62828] border-[#ffcdd2]`;
    }
    return `${baseClass} bg-[#f5f5f5] text-[#616161] border-[#e0e0e0]`;
  };

  const getPriorityClass = (priority: string) => {
    const baseClass =
      "text-[10px] font-bold uppercase tracking-wide pl-4 pr-6 py-1 rounded-full border shadow-sm w-full block appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 text-center truncate";
    const normal = priority.toLowerCase().replace(/[\s-]/g, "");

    if (normal === "high") {
      return `${baseClass} bg-[#ffebee] text-[#c62828] border-[#ffcdd2]`;
    }
    if (normal === "medium") {
      return `${baseClass} bg-[#fffdf7] text-[#f57f17] border-[#fff9c4]`;
    }
    return `${baseClass} bg-[#eaf7ee] text-[#2e7d32] border-[#c8e6c9]`;
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
      key: "project_id",
      label: "Linked Project",
      width: "20%",
      render: (t) => {
        const project = AVAILABLE_PROJECTS.find((p) => p.id === t.project_id);
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
      key: "assignee",
      label: "Assignee",
      width: "13%",
      sortable: true,
      render: (t) => (
        <span
          className="block truncate max-w-full text-xs text-slate-700 font-medium"
          title={t.assignee}
        >
          {t.assignee}
        </span>
      ),
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
              onChange={(e) => updateTaskPriority(t.id, e.target.value)}
              className={getPriorityClass(t.priority)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-white text-slate-900 normal-case"
                >
                  {opt}
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
              onChange={(e) => updateTaskStatus(t.id, e.target.value)}
              className={getStatusClass(t.status)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-white text-slate-900 normal-case"
                >
                  {opt}
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
          {t.due_date}
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
                assignee: t.assignee,
                due_date: t.due_date,
                status: t.status,
                priority: t.priority,
                project_id: t.project_id,
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
      className={`space-y-6 mx-auto pb-16 px-4 font-aileron transition-all duration-300 ease-in-out max-w-full w-full ${
        isSidebarOpen ? "xl:pr-[448px]" : "max-w-[1240px]"
      }`}
    >
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#2a7797] bg-slate-50 hover:bg-[#e6f4f8] transition-all duration-200 px-4 py-2 rounded-xl border border-slate-200/60 shadow-xs group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span>Back to Landing Page</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - List
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            Tasks for the Week
          </h1>
        </div>

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

          <div className="flex items-center gap-1 bg-[#fbfaf7] border border-slate-200/60 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] overflow-x-auto no-scrollbar max-w-full">
            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-white text-[#2a7797] font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-100"
                      : "text-slate-500 hover:text-slate-800 font-medium"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
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
        availableProjects={AVAILABLE_PROJECTS}
        availableUsers={AVAILABLE_USERS}
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
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedTask(null);
        }}
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}
