"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  Network,
  FileCheck2,
  GraduationCap,
  TrendingUp,
  Activity,
  ArrowUpRight,
  BarChart3,
  PieChart as PieIcon,
  Flag,
  CheckCircle2,
  Circle,
  Calendar,
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

const PIE_COLORS = ["#4ec2bb", "#2a7797", "#f59e0b"];
const AVAILABLE_YEARS = ["2024", "2025", "2026"];

export default function DashboardLandingPage() {
  // Default tracking year is set to current year (2026)
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<CombinedEvent[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-run mock query lifecycle anytime selectedYear changes
  useEffect(() => {
    setIsLoading(true);

    // Simulating database aggregations filtered by targeting specific years
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
    { year: "2026", Delivered: 55 },
  ];

  const projectStatusDistribution = stats
    ? [
        { name: "On-going / In-Progress", value: stats.activeProjects },
        { name: "Completed", value: stats.completedProjects },
        { name: "Backlog / Queued", value: stats.backlogProjects },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto font-sans pb-16 px-4">
      {/* Top Header Controls Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px]">
            Dashboard Home
          </span>
          <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
            Landing Page
          </h1>
        </div>

        {/* Global Pipeline Year Filter Dropdown Control */}
        <div className="flex items-center gap-2 bg-[#fffdf8] border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-[#2a7797]" />
          <label
            htmlFor="year-select"
            className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider"
          >
            Filtered Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent font-mono text-xs font-bold text-[#174e64] focus:outline-none cursor-pointer pr-1"
          >
            {AVAILABLE_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Welcome Operational Banner */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[28px] p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] bg-[#e6f4f8] px-2.5 py-1 rounded-md">
            Internal Operations Hub
          </span>
          <h2 className="text-4xl font-extrabold text-[#11161a] leading-tight tracking-tight">
            Bioinformatics Workflow <br />
            Dashboard
          </h2>
          <p className="text-sm text-[#5c6e7a] font-medium leading-relaxed">
            One internal workspace for service tracking, training, internships,
            collaborations, projects, accomplishments, documents, and repository
            links.
          </p>
        </div>
        <div className="flex-shrink-0 bg-slate-100 px-6 py-4 rounded-2xl border border-slate-200/60 font-mono text-xs text-slate-500">
          🧬 PGC VISAYAS NODE
        </div>
      </div>

      {/* ================= SUMMARY CARDS LAYER (DYNAMICS LOAD) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#eafafa] border border-[rgba(78,194,187,0.2)] rounded-[22px] p-6 flex flex-col justify-between shadow-sm min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-[#2e8b87] mb-1">
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-[#3ea39f] mt-4 pt-2 border-t border-[rgba(78,194,187,0.15)]">
            <span className="bg-[#d5f5f5] px-1.5 py-0.5 rounded text-[#1c5c59]">
              {stats?.activeProjects} Active
            </span>
            <span className="text-slate-400">•</span>
            <span>{stats?.completedProjects} Completed</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#f3faf5] border border-emerald-200/60 rounded-[22px] p-6 flex flex-col justify-between shadow-sm min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                Collaborations
              </span>
              <Network className="w-4 h-4 opacity-80" />
            </div>
            {isLoading || !stats ? (
              <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
            ) : (
              <div className="text-4xl font-black text-emerald-900 tracking-tight">
                {stats.activeCollaborations + stats.completedCollaborations}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 mt-4 pt-2 border-t border-emerald-100">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {stats?.activeCollaborations} Active
            </span>
            <span className="text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">
              {stats?.completedCollaborations} Completed
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#f0f4f8] border border-[rgba(42,119,151,0.15)] rounded-[22px] p-6 flex flex-col justify-between shadow-sm min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-[#2a7797] mb-1">
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
          <div className="flex items-center justify-between text-[11px] font-bold text-[#356d83] mt-4 pt-2 border-t border-slate-200/60">
            <span className="flex items-center gap-0.5 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />+{stats?.reportsNew} Year
              Metrics
            </span>
            <span className="text-slate-400 font-normal">Active context</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#fffbe6] border border-amber-200 rounded-[22px] p-6 flex flex-col justify-between shadow-sm min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-amber-800 mb-1">
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
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 mt-4 pt-2 border-t border-amber-200/40">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              {stats?.ongoingTrainings} Active
            </span>
            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
              {stats?.totalInterns} Interns
            </span>
          </div>
        </div>
      </div>

      {/* ================= TASKS FOR THE WEEK SECTION ================= */}
      <div className="bg-white border border-[rgba(23,33,38,0.06)] rounded-[24px] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <h3 className="text-sm font-extrabold text-[#11161a] uppercase tracking-wider">
            Tasks for the Week
          </h3>
          <span className="text-[10px] font-bold text-[#2a7797] bg-[#e6f4f8] px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Task Table
          </span>
        </div>

        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.status === "completed";
            return (
              <div
                key={task.id}
                onClick={() => handleToggleTaskStatus(task.id)}
                className={`border rounded-2xl p-3 flex items-center justify-between transition-all duration-250 cursor-pointer select-none group ${
                  isCompleted
                    ? "bg-slate-50/70 border-slate-200/60 opacity-60"
                    : "bg-[#f8f9fa] border-slate-100/80 hover:bg-slate-100/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Flag
                      className={`w-3.5 h-3.5 shrink-0 ${isCompleted ? "text-slate-300" : task.flagColor}`}
                    />
                    <span
                      className={`text-xs font-mono font-medium ${isCompleted ? "line-through text-slate-400" : "text-slate-700"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-bold ${isCompleted ? "bg-slate-200/50 text-slate-400" : `${task.tagBgClass} ${task.tagColorClass}`}`}
                >
                  {task.category}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CHARTS AND EVENTS BOTTOM GRID AREA ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recharts Panel */}
        <div className="xl:col-span-2 space-y-6">
          {/* Yearly Service Reports Bar Chart */}
          <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#2a7797] mb-6">
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
                    className="text-xs font-bold fill-slate-400"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    className="text-xs font-mono fill-slate-400"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                    }}
                  />
                  {/* Highlight current filtered year column bar */}
                  <Bar dataKey="Delivered" radius={[6, 6, 0, 0]} barSize={24}>
                    {serviceReportsDeliveredByYear.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.year === selectedYear ? "#2a7797" : "#91247b"
                        }
                        opacity={entry.year === selectedYear ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Distribution Donut Chart */}
          <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#2a7797] mb-4">
              <PieIcon className="w-4 h-4" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                Project Distribution ({selectedYear})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <span className="block text-xl font-black text-slate-800 tracking-tight">
                    {totalProjects}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Total
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {projectStatusDistribution.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx] }}
                      />
                      <span className="text-slate-500 font-semibold text-xs">
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Events */}
        <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-6 shadow-sm h-fit space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-[#11161a] uppercase tracking-wider">
              Upcoming Events
            </h3>
            <span className="text-[9px] font-bold text-[#2a7797] bg-[#e6f4f8] px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
              Calendar Event
            </span>
          </div>
          <div className="space-y-2.5">
            {events.map((event) => (
              <div
                key={event.id}
                className={`${event.bgClass} p-2.5 rounded-xl flex items-center gap-4 transition-all hover:brightness-[0.98]`}
              >
                <div
                  className={`${event.badgeClass} w-[72px] py-1 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white tracking-wide shrink-0 shadow-sm`}
                >
                  {event.displayDate}
                </div>
                <span className="text-xs font-mono font-medium text-slate-700 truncate">
                  {event.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
