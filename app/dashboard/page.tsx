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
  Flag,
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

interface CombinedEvent {
  id: string;
  title: string;
  date: Date;
  displayDate: string;
  bgClass: string;
  badgeClass: string;
}

interface WeeklyTask {
  id: string;
  title: string;
  dueDate: Date;
  status: "pending" | "completed";
  category: "Biology" | "CompSci" | "Both";
  tagColorClass: string;
  tagBgClass: string;
  flagColor: string;
}

const PIE_COLORS = ["#4ec2bb", "#2a7797", "#f59e0b", "#6366f1", "#94a3b8"];
const AVAILABLE_YEARS = ["2024", "2025", "2026"];

export default function DashboardLandingPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<CombinedEvent[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to target the hidden/styled select click handler dynamically
  const selectRef = useRef<HTMLSelectElement>(null);

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

    setEvents([
      {
        id: "ev-1",
        title: "Sprint planning",
        date: new Date("2026-06-29"),
        displayDate: "Jun 29",
        bgClass: "bg-[#f4f7f6]",
        badgeClass: "bg-[#2a7797]",
      },
      {
        id: "ev-2",
        title: "Omics workflow review",
        date: new Date("2026-07-03"),
        displayDate: "Jul 03",
        bgClass: "bg-[#f4faf8]",
        badgeClass: "bg-[#4ec2bb]",
      },
      {
        id: "ev-3",
        title: "User testing with BDML",
        date: new Date("2026-07-08"),
        displayDate: "Jul 08",
        bgClass: "bg-[#f4f4f8]",
        badgeClass: "bg-[#2b347c]",
      },
      {
        id: "ev-4",
        title: "Final demo + transition",
        date: new Date("2026-07-12"),
        displayDate: "Jul 12",
        bgClass: "bg-[#faf4f8]",
        badgeClass: "bg-[#9d2482]",
      },
      {
        id: "ev-5",
        title: "WGS pipeline handoff",
        date: new Date("2026-07-18"),
        displayDate: "Jul 18",
        bgClass: "bg-[#f5faf4]",
        badgeClass: "bg-[#5cb051]",
      },
      {
        id: "ev-6",
        title: "Visayas Core facility audit",
        date: new Date("2026-07-22"),
        displayDate: "Jul 22",
        bgClass: "bg-[#faf8f4]",
        badgeClass: "bg-[#d97706]",
      },
      {
        id: "ev-7",
        title: "Metagenomics training session",
        date: new Date("2026-07-27"),
        displayDate: "Jul 27",
        bgClass: "bg-[#f4faf8]",
        badgeClass: "bg-[#0d9488]",
      },
      {
        id: "ev-8",
        title: "HPC maintenance window",
        date: new Date("2026-08-02"),
        displayDate: "Aug 02",
        bgClass: "bg-[#fef2f2]",
        badgeClass: "bg-[#dc2626]",
      },
      {
        id: "ev-9",
        title: "Monthly collaboration sync",
        date: new Date("2026-08-05"),
        displayDate: "Aug 05",
        bgClass: "bg-[#f4f4f8]",
        badgeClass: "bg-[#4f46e5]",
      },
    ]);

    setTasks([
      {
        id: "task-1",
        title: "Validate service status states",
        dueDate: new Date(),
        status: "pending",
        category: "Biology",
        tagColorClass: "text-amber-700",
        tagBgClass: "bg-amber-50",
        flagColor: "text-amber-500",
      },
      {
        id: "task-2",
        title: "Review access permissions",
        dueDate: new Date(),
        status: "pending",
        category: "CompSci",
        tagColorClass: "text-slate-600",
        tagBgClass: "bg-slate-100",
        flagColor: "text-slate-500",
      },
      {
        id: "task-3",
        title: "Prepare deployment check",
        dueDate: new Date(),
        status: "pending",
        category: "CompSci",
        tagColorClass: "text-[#2a7797]",
        tagBgClass: "bg-[#e6f4f8]",
        flagColor: "text-[#4ec2bb]",
      },
      {
        id: "task-4",
        title: "Import activity-sheet exports",
        dueDate: new Date(),
        status: "pending",
        category: "Both",
        tagColorClass: "text-emerald-700",
        tagBgClass: "bg-emerald-50",
        flagColor: "text-emerald-500",
      },
    ]);

    setIsLoading(false);
  }, [selectedYear]);

  const handleToggleTaskStatus = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === "pending" ? "completed" : "pending",
            }
          : task,
      ),
    );
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Home
          </span>
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
            Landing Page
          </h1>
        </div>

        {/* Global Pipeline Year Filter Button Control */}
        <div className="relative self-start sm:self-auto group">
          {/* Visual Presentation Layout */}
          <div className="flex items-center gap-2 bg-[#fffdf8] group-hover:bg-slate-50 transition-colors duration-150 border border-slate-300 rounded-xl px-3 py-1.5 shadow-md shadow-slate-400/20 text-left pointer-events-none">
            <Calendar className="w-3.5 h-3.5 text-[#2a7797]" />
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-quicksand select-none">
              Filtered Year:
            </span>
            <span className="text-xs font-bold text-[#174e64]">
              {selectedYear}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#174e64] ml-1" />
          </div>

          {/* Invisible, Full-Width Native Select to drive dropdown expansion */}
          <select
            ref={selectRef}
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-bold text-xs"
          >
            {AVAILABLE_YEARS.map((year) => (
              <option
                key={year}
                value={year}
                className="bg-white text-slate-700 font-medium"
              >
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Welcome Operational Banner */}
      <div className="relative overflow-hidden w-full rounded-[32px] p-8 md:p-12 shadow-xl shadow-slate-400/25 border border-slate-300/70 bg-gradient-to-tr from-[#f9f5eb] via-[#fdfdfd] to-[#e1f1f5] flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4 max-w-2xl z-10">
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-[#2a7797] font-quicksand block">
            Internal Operations Hub
          </span>

          <h2 className="text-4xl md:text-[44px] font-black text-slate-800 leading-[1.15] tracking-tight font-aileron">
            Bioinformatics Workflow <br />
            Dashboard
          </h2>

          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-xl pt-1">
            One internal workspace for service tracking, training, internships,
            collaborations, projects, accomplishments, documents, and repository
            links.
          </p>
        </div>

        <div className="flex-shrink-0 z-10 self-end md:self-auto bg-[#ffffff] backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-300 shadow-md shadow-slate-400/30 flex items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <img
              src="/assets/pgcv_logo.png"
              alt="Philippine Genome Center Visayas logo"
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-200/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Summary Cards Layer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Projects */}
        <div className="bg-[#eafafa] border border-teal-300/40 rounded-[22px] p-6 shadow-md shadow-[#1c5c59]/20 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-[#1c5c59]/30 hover:-translate-y-0.5">
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
              <div className="text-4xl font-black text-[#1c5c59] tracking-tight">
                {totalProjects}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-[rgba(78,194,187,0.25)]">
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
        <div className="bg-[#f3faf5] border border-emerald-300/40 rounded-[22px] p-6 shadow-md shadow-emerald-950/20 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-950/30 hover:-translate-y-0.5">
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
              <div className="text-4xl font-black text-emerald-900 tracking-tight">
                {(stats?.activeCollaborations ?? 0) +
                  (stats?.completedCollaborations ?? 0)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-emerald-200">
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
        <div className="bg-[#f0f4f8] border border-blue-200 rounded-[22px] p-6 shadow-md shadow-slate-700/20 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-slate-700/30 hover:-translate-y-0.5">
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
              <div className="text-4xl font-black text-[#174e64] tracking-tight">
                {stats.reportsDelivered}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-slate-200/60">
            <span className="flex items-center gap-1 bg-[#e6f4f8] text-[#174e64] px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +{stats?.reportsNew} New
            </span>
            <span className="flex items-center gap-1 bg-white/60 text-[#356d83] px-2 py-1 rounded-full border border-slate-200/60">
              <FileCheck2 className="w-3 h-3" /> Historical
            </span>
          </div>
        </div>

        {/* Card 4: Programs Hub */}
        <div className="bg-[#fffbe6] border border-amber-300/60 rounded-[22px] p-6 shadow-md shadow-amber-950/15 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-amber-950/25 hover:-translate-y-0.5">
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
              <div className="text-4xl font-black text-amber-900 tracking-tight">
                {stats.totalTrainings}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-amber-200">
            <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-full">
              <Activity className="w-3 h-3" /> {stats?.ongoingTrainings} Active
            </span>
            <span className="flex items-center gap-1 bg-white/60 text-amber-800 px-2 py-1 rounded-full border border-amber-200/60">
              <GraduationCap className="w-3 h-3" /> {stats?.totalInterns}{" "}
              Interns
            </span>
          </div>
        </div>
      </div>

      {/* Tasks for the Week Section */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/20 xl:row-span-2">
        <div className="flex items-center justify-between mb-6 font-quicksand">
          <div className="flex items-center gap-2 text-[#2a7797]">
            <CheckSquare className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Tasks for the Week
            </h3>
          </div>

          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-md shadow-slate-400/10"
          >
            <span>View Tasks Page</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";
            return (
              <div
                key={task.id}
                onClick={() => handleToggleTaskStatus(task.id)}
                className={`border rounded-2xl p-3 flex items-center justify-between transition-all duration-150 cursor-pointer select-none group ${
                  isCompleted
                    ? "bg-slate-100/70 border-slate-200 opacity-60 shadow-none"
                    : "bg-slate-50 border-slate-300 shadow-md shadow-slate-400/10 hover:bg-slate-200/80 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-400/15"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Flag
                      className={`w-3.5 h-3.5 shrink-0 ${isCompleted ? "text-slate-300" : task.flagColor}`}
                    />
                    <span
                      className={`text-xs font-medium ${isCompleted ? "line-through text-slate-400" : "text-slate-700"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-bold ${isCompleted ? "bg-slate-200 text-slate-500" : `${task.tagBgClass} ${task.tagColorClass}`}`}
                >
                  {task.category}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts and Events Bottom Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Yearly Service Reports Bar Chart */}
        <div className="md:col-span-2 bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/20">
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
                  className="text-xs font-bold fill-slate-400 font-aileron"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-slate-400 font-aileron"
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
                  }}
                  itemStyle={{
                    fontSize: "12px",
                    fontWeight: "500",
                  }}
                  labelStyle={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "2px",
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
        <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/20 xl:row-span-2">
          <div className="flex items-center gap-2 text-[#2a7797] mb-6 font-quicksand">
            <Calendar className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Upcoming Events
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 subtle-scrollbar">
            {events.map((event) => (
              <div
                key={event.id}
                className={`${event.bgClass} p-2.5 rounded-xl flex items-center gap-4 transition-all hover:brightness-[0.97] shadow-md shadow-slate-400/10 border border-slate-200/50`}
              >
                <div
                  className={`${event.badgeClass} w-[72px] py-1 rounded-lg flex items-center justify-center text-xs font-bold text-white tracking-wide shrink-0 shadow-md shadow-black/10`}
                >
                  {event.displayDate}
                </div>
                <span className="text-xs font-medium text-slate-700 truncate">
                  {event.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Distribution Donut Chart */}
        <div className="md:col-span-2 bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#2a7797] mb-4 font-quicksand">
              <PieIcon className="w-4 h-4" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                Project Distribution ({selectedYear})
              </h3>
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
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="block text-xl font-black text-slate-800 tracking-tight">
                    {totalProjects}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-quicksand">
                    Total
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {projectStatusDistribution.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200 shadow-md shadow-slate-400/5"
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
