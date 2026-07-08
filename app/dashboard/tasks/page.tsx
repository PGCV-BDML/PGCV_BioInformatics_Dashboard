"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ComplianceFooter from "../../components/compliancefooter";
import DataTable, { Column } from "../../components/datatable";
import Pagination from "../../components/pagination";
import DeleteModal from "../../components/deletemodal";
import {
  ArrowLeft,
  Search,
  CheckSquare,
  Edit3,
  Trash2,
  Plus,
  X,
  User,
  Calendar,
  ClipboardCheck,
  Save,
  Inbox,
  Briefcase,
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

// Seed baseline operational database structures matching 2026 schema
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
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

export default function TasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task;
    direction: "asc" | "desc";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // CRUD Lifecycle State Triggers
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const emptyForm: Omit<Task, "id"> = {
    title: "",
    assignee: AVAILABLE_USERS[0],
    due_date: "",
    status: "Pending",
    priority: "Medium",
    project_id: AVAILABLE_PROJECTS[0].id,
  };

  const [formState, setFormState] = useState<Omit<Task, "id">>(emptyForm);

  const filteredTasks = useMemo(() => {
    return tasksList.filter((task) => {
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
      return searchPool.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, tasksList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sortedTasks = useMemo(() => {
    let sortableItems = [...filteredTasks];
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
  }, [sortedTasks, currentPage]);

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
      case "In-Progress":
        return (
          <span className={`${baseClass} bg-[#fffde7] text-[#f57f17]`}>
            In-Progress
          </span>
        );
      case "On Hold":
        return (
          <span className={`${baseClass} bg-[#ffebee] text-[#c62828]`}>
            On Hold
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-[#f5f5f5] text-[#616161]`}>
            Pending
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string) => {
    const baseClass =
      "px-2 py-0.5 rounded-md text-[11px] font-bold inline-block";
    switch (priority) {
      case "Critical":
        return (
          <span
            className={`${baseClass} bg-red-100 text-red-700 border border-red-200`}
          >
            Critical
          </span>
        );
      case "High":
        return (
          <span
            className={`${baseClass} bg-orange-100 text-orange-700 border border-orange-200`}
          >
            High
          </span>
        );
      case "Medium":
        return (
          <span
            className={`${baseClass} bg-amber-100 text-amber-700 border border-amber-200`}
          >
            Medium
          </span>
        );
      default:
        return (
          <span
            className={`${baseClass} bg-slate-100 text-slate-600 border border-slate-200`}
          >
            Low
          </span>
        );
    }
  };

  const renderSectionLabel = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[1.5px] mb-3 mt-1">
      {icon} <span>{text}</span>
    </div>
  );

  const columns: Column<Task>[] = [
    {
      key: "title",
      label: "Task Description",
      width: "25%",
      sortable: true,
      render: (t) => (
        <span className="font-bold text-[#11161a] block line-clamp-2">
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
          <span className="text-slate-600 text-xs font-medium">
            {project ? project.name : "Unlinked"}
          </span>
        );
      },
    },
    { key: "assignee", label: "Assignee", width: "15%", sortable: true },
    {
      key: "priority",
      label: "Priority",
      width: "10%",
      sortable: true,
      render: (t) => renderPriorityBadge(t.priority),
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      sortable: true,
      render: (t) => renderStatusBadge(t.status),
    },
    { key: "due_date", label: "Due Date", width: "10%", sortable: true },
    {
      key: "id",
      label: "Actions",
      width: "8%",
      render: (t) => (
        <div className="flex items-center justify-center gap-1">
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
            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(t);
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
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Back Button Action Area */}
      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#2a7797] bg-slate-50 hover:bg-[#e6f4f8] transition-all duration-200 px-4 py-2 rounded-xl border border-slate-200/60 shadow-xs group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span>Back to Landing Page</span>
        </Link>
      </div>

      {/* Main Tasks Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - List
          </span>
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight flex items-center gap-3">
            Tasks for the Week
          </h1>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full min-[480px]:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-[#fffdf8] rounded-full border border-gray-200 text-[14px] outline-none focus:ring-2 focus:ring-[#4ec2bb]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFormState(emptyForm);
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-full shadow-md transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Task
          </button>
        </div>
      </div>

      {/* Main Reactive Spreadsheet Wrapper */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <CheckSquare className="w-6 h-6 text-[#333333]" />
          <h2 className="text-3xl font-bold text-[#333333]">List of Tasks</h2>
        </div>

        {tasksList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-500">
              No core tasks indexed
            </span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* UNIFIED INTERACTIVE CRADLE MODALS (Add/Edit Form Layout Container) */}
      {(isAdding || isEditing) && (
        <div className="fixed inset-0 w-screen h-screen z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300">
          <div className="relative bg-[#ffffff] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#2a7797] via-[#4ec2bb] to-[#2a7797]" />

            <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-[#ffffff]">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isAdding ? "Create Workflow Task" : "Modify Task Parameters"}
                </h3>
                <p className="text-slate-500 text-sm mt-1 font-medium font-aileron">
                  {isAdding
                    ? "Initialize details, prioritize dependencies, and assign tracking to a pipeline engineer."
                    : "Update execution properties, assignments, schedules, or structural relations."}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  isAdding ? setIsAdding(false) : setIsEditing(false)
                }
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={isAdding ? handleAddSubmit : handleEditSubmit}
              className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar"
            >
              {/* SECTION 1: Task Title Definition */}
              <div className="space-y-3">
                {renderSectionLabel(
                  <ClipboardCheck className="w-3.5 h-3.5" />,
                  "Task Assignment Overview",
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-800 ml-1">
                    Task Description
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g., Run downstream validation scripts against assemblies"
                    value={formState.title}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* SECTION 2: Project Link Mapping */}
              <div className="space-y-3">
                {renderSectionLabel(
                  <Briefcase className="w-3.5 h-3.5" />,
                  "Project Architecture Bounds",
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-800 ml-1">
                    Linked Hub Project
                  </label>
                  <select
                    name="project_id"
                    required
                    value={formState.project_id}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                  >
                    {AVAILABLE_PROJECTS.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 3: Resource Allocation & Priority Configurations */}
              <div className="space-y-3">
                {renderSectionLabel(
                  <User className="w-3.5 h-3.5" />,
                  "Ownership & Criticality Scaling",
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Assignee
                    </label>
                    <select
                      name="assignee"
                      required
                      value={formState.assignee}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                    >
                      {AVAILABLE_USERS.map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Execution Priority
                    </label>
                    <select
                      name="priority"
                      required
                      value={formState.priority}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                    >
                      {PRIORITY_OPTIONS.map((prio) => (
                        <option key={prio} value={prio}>
                          {prio}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Timeline Scheduling & Status */}
              <div className="space-y-3">
                {renderSectionLabel(
                  <Calendar className="w-3.5 h-3.5" />,
                  "Timeline Bounds & Milestones",
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      required
                      value={formState.due_date}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-800 ml-1">
                      Status Step
                    </label>
                    <select
                      name="status"
                      required
                      value={formState.status}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-sm font-medium text-black transition-all"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions Footer Navigation Layout Control Bar */}
              <div className="flex gap-3 justify-end pt-6 pb-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    isAdding ? setIsAdding(false) : setIsEditing(false)
                  }
                  className="h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 h-12 px-6 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-lg shadow-slate-200 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isAdding ? "Save Task" : "Commit Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Lifecycle Modal */}
      <DeleteModal
        isOpen={showDeleteConfirm}
        itemName={selectedTask?.title || ""}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRecord}
      />

      <ComplianceFooter />
    </div>
  );
}
