"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Network,
  FileCheck2,
  GraduationCap,
  Activity,
  ArrowUpRight,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  Circle,
  Calendar,
  CheckSquare,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type DashboardStats = {
  activeProjects: number;
  completedProjects: number;
  backlogProjects: number;
  newProjectsThisMonth: number;
  activeCollaborations: number;
  completedCollaborations: number;
  reportsDelivered: number;
  reportsNew: number;
  totalTrainings: number;
  ongoingTrainings: number;
  totalInterns: number;
};

interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  linkedProject: string;
  dueDate: Date;
  status: "pending" | "completed";
  priority: "high" | "medium" | "low";
}

const PIE_COLORS = ["#4ec2bb", "#2a7797", "#f59e0b", "#6366f1", "#94a3b8"];
const AVAILABLE_YEARS = ["2024", "2025", "2026"];

const priorityConfig = {
  high: {
    bar: "bg-red-500",
    text: "text-red-600",
    tagBg: "bg-red-50 border-red-200/60",
    tagText: "text-red-700",
  },
  medium: {
    bar: "bg-amber-500",
    text: "text-amber-600",
    tagBg: "bg-amber-50 border-amber-200/60",
    tagText: "text-amber-700",
  },
  low: {
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    tagBg: "bg-emerald-50 border-emerald-200/60",
    tagText: "text-emerald-700",
  },
};

export default function DashboardLandingPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectRef = useRef<HTMLSelectElement>(null);

  const toggleTaskStatus = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === "completed" ? "pending" : "completed",
            }
          : task,
      ),
    );
  };

  useEffect(() => {
    setIsLoading(true);

    const yearlyMockDB: Record<string, DashboardStats> = {
      "2026": {
        activeProjects: 24,
        completedProjects: 45,
        backlogProjects: 8,
        newProjectsThisMonth: 6,
        activeCollaborations: 3,
        completedCollaborations: 12,
        reportsDelivered: 18,
        reportsNew: 18,
        totalTrainings: 7,
        ongoingTrainings: 2,
        totalInterns: 31,
      },
      "2025": {
        activeProjects: 14,
        completedProjects: 64,
        backlogProjects: 3,
        newProjectsThisMonth: 0,
        activeCollaborations: 5,
        completedCollaborations: 8,
        reportsDelivered: 64,
        reportsNew: 4,
        totalTrainings: 5,
        ongoingTrainings: 0,
        totalInterns: 28,
      },
      "2024": {
        activeProjects: 2,
        completedProjects: 51,
        backlogProjects: 1,
        newProjectsThisMonth: 0,
        activeCollaborations: 1,
        completedCollaborations: 10,
        reportsDelivered: 70,
        reportsNew: 0,
        totalTrainings: 4,
        ongoingTrainings: 0,
        totalInterns: 20,
      },
    };

    setStats(yearlyMockDB[selectedYear] || yearlyMockDB["2026"]);

    setTasks([
      {
        id: "task-1",
        title: "Configure multi-node SLURM job matrix parameters",
        description:
          "Optimize node allocation profiles for heavy variant-calling execution schedules.",
        linkedProject: "NextFlow Pipeline Optimization",
        dueDate: new Date("2026-07-18"),
        status: "pending",
        priority: "high",
      },
      {
        id: "task-2",
        title: "Verify fastq adapter filtering thresholds via MultiQC reports",
        description:
          "Cross-examine adapter trimming stats on run batch #419 to ensure baseline index retention.",
        linkedProject: "Genomic Surveillance Batch-419",
        dueDate: new Date("2026-07-20"),
        status: "pending",
        priority: "medium",
      },
      {
        id: "task-3",
        title:
          "Deploy downstream R Shiny expression rendering visualization app",
        description:
          "Publish latest hotfixes to container server for differential transcript expression plots.",
        linkedProject: "Transcriptomics Visualizer",
        dueDate: new Date("2026-07-22"),
        status: "pending",
        priority: "low",
      },
      {
        id: "task-4",
        title: "Import activity-sheet exports",
        description:
          "Parse incoming external sequencers logs to match internally recorded operational metrics.",
        linkedProject: "Sequencing Data Ingestion Engine",
        dueDate: new Date("2026-07-25"),
        status: "pending",
        priority: "medium",
      },
    ]);

    setIsLoading(false);
  }, [selectedYear]);

  const totalProjects = stats
    ? stats.activeProjects + stats.completedProjects + stats.backlogProjects
    : 0;

  const serviceReportsDeliveredByYear = [
    { year: "2022", Delivered: 42 },
    { year: "2023", Delivered: 55 },
    { year: "2024", Delivered: 70 },
    { year: "2025", Delivered: 88 },
    { year: "2026", Delivered: stats?.reportsDelivered || 55 },
  ];

  const projectStatusDistribution = stats
    ? [
        { name: "On-going / In-Progress", value: stats.activeProjects },
        { name: "Completed", value: stats.completedProjects },
        { name: "On-hold / Overdue", value: stats.backlogProjects },
        { name: "Submitted", value: stats.newProjectsThisMonth },
        { name: "For approval", value: stats.ongoingTrainings },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header Controls Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300/40 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#6a7d8a] uppercase tracking-[2px] font-quicksand">
            Dashboard - Home
          </span>
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight font-aileron">
            Landing Page
          </h1>
        </div>

        {/* Global Pipeline Year Filter Button Control */}
        <div className="relative self-start sm:self-auto group">
          <div className="flex items-center gap-2 bg-[#fffdf8] group-hover:bg-slate-50 transition-colors duration-150 border border-slate-300 rounded-xl px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-left pointer-events-none">
            <Calendar className="w-3.5 h-3.5 text-[#2a7797]" />
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-quicksand select-none">
              Filtered Year:
            </span>
            <span className="text-xs font-bold text-[#174e64] font-quicksand">
              {selectedYear}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#174e64] ml-1" />
          </div>

          <select
            ref={selectRef}
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-bold text-xs font-quicksand"
          >
            {AVAILABLE_YEARS.map((year) => (
              <option
                key={year}
                value={year}
                className="bg-white text-slate-700 font-medium font-quicksand"
              >
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="relative overflow-hidden w-full rounded-[32px] p-8 md:p-12 shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-slate-300 bg-gradient-to-tr from-[#f9f5eb] via-[#fdfdfd] to-[#e1f1f5] flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4 max-w-2xl z-10">
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-[#2a7797] font-quicksand block">
            Internal Operations Hub
          </span>

          <h2 className="text-4xl md:text-[44px] font-black text-slate-800 leading-[1.15] tracking-tight font-aileron">
            Bioinformatics Workflow <br />
            Dashboard
          </h2>

          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-xl pt-1 font-aileron">
            One internal workspace for service tracking, training, internships,
            collaborations, projects, accomplishments, documents, and repository
            links.
          </p>
        </div>

        <div className="flex-shrink-0 z-10 self-end md:self-auto">
          <img
            src="/assets/pgcv_logo.png"
            alt="Philippine Genome Center Visayas logo"
            className="h-28 w-auto object-contain"
          />
        </div>

        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-200/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Summary Cards Layer - Upgraded ambient color-matching shadows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Projects */}
        <div className="bg-[#eafafa] border border-teal-300/50 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(28,92,89,0.12)] flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-[#2e8b87] mb-1 font-quicksand">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Total Projects ({selectedYear})
              </span>
              <FolderGit2 className="w-4 h-4 opacity-80" />
            </div>
            {isLoading || !stats ? (
              <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-black text-[#1c5c59] tracking-tight font-aileron">
                {totalProjects}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-[rgba(78,194,187,0.25)] font-aileron">
            <span className="flex items-center gap-1 bg-[#d5f5f5] text-[#1c5c59] px-2 py-1 rounded-full">
              <Activity className="w-3 h-3" /> {stats?.activeProjects} Active
            </span>
            <span className="flex items-center gap-1 bg-white/60 text-[#3ea39f] px-2 py-1 rounded-full border border-[rgba(78,194,187,0.25)]">
              <CheckCircle2 className="w-3 h-3" /> {stats?.completedProjects}{" "}
              Done
            </span>
          </div>
        </div>

        {/* Card 2: Collaborations */}
        <div className="bg-[#f3faf5] border border-emerald-300/50 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(6,78,59,0.1)] flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-emerald-700 mb-1 font-quicksand">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Collaborations
              </span>
              <Network className="w-4 h-4 opacity-80" />
            </div>
            {isLoading || !stats ? (
              <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-black text-emerald-900 tracking-tight font-aileron">
                {(stats?.activeCollaborations ?? 0) +
                  (stats?.completedCollaborations ?? 0)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-emerald-200 font-aileron">
            <span className="flex items-center gap-1 bg-emerald-100/70 text-emerald-800 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats?.activeCollaborations} Active
            </span>
            <span className="flex items-center gap-1 bg-white/60 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200/60">
              <CheckCircle2 className="w-3 h-3" />{" "}
              {stats?.completedCollaborations} Done
            </span>
          </div>
        </div>

        {/* Card 3: Service Reports */}
        <div className="bg-[#f0f4f8] border border-blue-200 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(23,78,100,0.1)] flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-[#2a7797] mb-1 font-quicksand">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Service Reports
              </span>
              <FileCheck2 className="w-4 h-4 opacity-80" />
            </div>
            {isLoading || !stats ? (
              <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-black text-[#174e64] tracking-tight font-aileron">
                {stats.reportsDelivered}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-slate-200/60 font-aileron">
            <span className="flex items-center gap-1 bg-[#e6f4f8] text-[#174e64] px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +{stats?.reportsNew} New
            </span>
            <span className="flex items-center gap-1 bg-white/60 text-[#356d83] px-2 py-1 rounded-full border border-slate-200/60">
              <FileCheck2 className="w-3 h-3" /> Historical
            </span>
          </div>
        </div>

        {/* Card 4: Programs Hub */}
        <div className="bg-[#fffbe6] border border-amber-300/60 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(146,64,14,0.08)] flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-amber-800 mb-1 font-quicksand">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Programs Hub
              </span>
              <GraduationCap className="w-4 h-4 opacity-80" />
            </div>
            {isLoading || !stats ? (
              <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-black text-amber-900 tracking-tight font-aileron">
                {stats.totalTrainings}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-amber-200 font-aileron">
            <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-full">
              <Activity className="w-3 h-3" /> {stats?.ongoingTrainings} Active
            </span>
            <span className="flex items-center gap-1 bg-white/60 text-[#b58105] px-2 py-1 rounded-full border border-amber-200/60 font-aileron">
              <GraduationCap className="w-3 h-3" /> {stats?.totalInterns}{" "}
              Interns
            </span>
          </div>
        </div>
      </div>

      {/* Tasks for the Week Section */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)] xl:row-span-2">
        <div className="flex items-center justify-between mb-6 font-quicksand">
          <div className="flex items-center gap-2 text-[#2a7797]">
            <CheckSquare className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Tasks for the Week
            </h3>
          </div>

          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)] font-quicksand"
          >
            <span>View Tasks Page</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* List showing Details */}
        <div className="space-y-3.5">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";
            const currentPriority =
              priorityConfig[task.priority] || priorityConfig.low;

            return (
              <Link
                key={task.id}
                href={`/dashboard/tasks?search=${encodeURIComponent(task.title)}`}
                className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 cursor-pointer select-none group font-aileron ${
                  isCompleted
                    ? "bg-slate-100/70 border-slate-200 opacity-60 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                    : "bg-[#fffdf8] border-slate-300 shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:border-slate-400 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] hover:-translate-y-0.5"
                }`}
              >
                {/* Left Area */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={(e) => toggleTaskStatus(task.id, e)}
                    className="shrink-0 mt-1 cursor-pointer transition-transform duration-100 hover:scale-110 active:scale-95 focus:outline-none"
                    title={
                      isCompleted ? "Mark as pending" : "Mark as completed"
                    }
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    )}
                  </button>

                  <div
                    className={`w-1 rounded-full shrink-0 min-h-[44px] ${
                      isCompleted ? "bg-slate-300" : currentPriority.bar
                    }`}
                  />

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span
                      className={`text-sm font-bold tracking-tight ${
                        isCompleted
                          ? "line-through text-slate-400"
                          : "text-slate-800"
                      }`}
                    >
                      {task.title}
                    </span>

                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold font-aileron ${
                        isCompleted
                          ? "text-slate-400"
                          : "text-[#2a7797] hover:underline"
                      }`}
                    >
                      <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{task.linkedProject}</span>
                    </div>
                  </div>
                </div>

                {/* Right Area */}
                <div className="shrink-0 self-end md:self-center">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border font-quicksand ${
                      isCompleted
                        ? "bg-slate-200 text-slate-500 border-slate-300"
                        : `${currentPriority.tagBg} ${currentPriority.tagText}`
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Due:{" "}
                      {task.dueDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts and Events Bottom Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Yearly Service Reports Bar Chart */}
        <div className="md:col-span-2 bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
          <div className="flex items-center gap-2 text-[#2a7797] mb-6 font-quicksand">
            <BarChart3 className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Service Reports Delivered by Year
            </h3>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serviceReportsDeliveredByYear}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs font-bold fill-slate-400 font-quicksand"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-slate-400 font-quicksand"
                />
                <Tooltip
                  wrapperStyle={{
                    fontFamily: "Aileron, sans-serif",
                    zIndex: 50,
                  }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    padding: "8px 12px",
                    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
                  }}
                  itemStyle={{
                    fontSize: "12px",
                    fontWeight: "500",
                    fontFamily: "Aileron, sans-serif",
                  }}
                  labelStyle={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "2px",
                    fontFamily: "Aileron, sans-serif",
                  }}
                />
                <Bar dataKey="Delivered" radius={[6, 6, 0, 0]} barSize={24}>
                  {serviceReportsDeliveredByYear.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.year === selectedYear ? "#2a7797" : "#91247b"}
                      opacity={entry.year === selectedYear ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Events Column */}
        <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)] xl:row-span-2">
          <div className="flex items-center gap-2 text-[#2a7797] mb-6 font-quicksand">
            <Calendar className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Upcoming Events
            </h3>
          </div>

          <div className="flex flex-col items-center justify-center h-full pb-10 text-center">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-slate-100 border border-slate-200 shadow-inner">
              <Calendar className="w-6 h-6 text-[#7a8e9b]" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-[2px] text-[#2a7797] font-quicksand block mb-1">
              Coming Soon
            </span>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-sm font-aileron">
              The automated event tracker and synchronization feature is
              currently under development. Check back later for updates.
            </p>
          </div>
        </div>

        {/* Project Distribution Donut Chart */}
        <div className="md:col-span-2 bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 font-quicksand">
              <div className="flex items-center gap-2 text-[#2a7797]">
                <PieIcon className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  Project Distribution ({selectedYear})
                </h3>
              </div>

              <Link
                href="/dashboard/projects"
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)] font-quicksand"
              >
                <span>View Projects Page</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center my-auto py-2">
              <div className="w-full h-48 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {projectStatusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{
                        fontFamily: "Aileron, sans-serif",
                        zIndex: 50,
                      }}
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="block text-xl font-black text-slate-800 tracking-tight font-aileron">
                    {totalProjects}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-quicksand">
                    Total
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 font-aileron">
                {projectStatusDistribution.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.02)]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                        }}
                      />
                      <span className="text-slate-500 font-semibold text-xs">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
