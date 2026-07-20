"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { DashboardBreadcrumbs } from "../components/dashboardbreadcrumbs";
import { DashboardStatsCards } from "../components/dashboard-stat-cards";
import { WeeklyTaskList } from "../components/weekly-task-list";
import { ServiceReportsChart } from "../components/service-reports-chart";
import { ProjectDistributionChart } from "../components/project-distribution-chart";
import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import { yearlyMockDB, type DashboardStats } from "@/lib/mock-data";
interface TaskRow {
  id: string;
  title: string | null;
  assignee_id: string;
  due_date: string | null;
  status: string;
  priority: string;
  linked_project_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}
interface ProjectRow {
  id: string;
  title?: string | null;
  name?: string | null;
}
interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  linkedProject: string;
  dueDate: Date | null;
  status: "pending" | "completed";
  priority: "high" | "medium" | "low";
}

const AVAILABLE_YEARS = ["2024", "2025", "2026"];

function normalizePriority(raw: string | null | undefined): WeeklyTask["priority"] {
  const value = (raw ?? "").toLowerCase().trim();
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function normalizeStatus(raw: string | null | undefined): WeeklyTask["status"] {
  return (raw ?? "").toLowerCase().trim() === "completed" ? "completed" : "pending";
}

export default function DashboardLandingPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Breadcrumb trail where "Dashboard" is the first element, and "Home" is second and hoverable
  const breadcrumbTrail = [
    { label: "Dashboard" },
    { label: "Home", href: "/dashboard" },
  ];

  const toggleTaskStatus = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const nextStatus: WeeklyTask["status"] =
      target.status === "completed" ? "pending" : "completed";

    // Optimistic UI update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, status: nextStatus } : task,
      ),
    );

    try {
      await saveDataToDB("task", id, { status: nextStatus });
    } catch (err) {
      console.error("Failed to update task status:", err);
      // roll back on failure
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, status: target.status } : task,
        ),
      );
    }
  };

  useEffect(() => {
    setIsLoading(true);

    setStats(yearlyMockDB[selectedYear] ?? yearlyMockDB["2026"] ?? null);
    setIsLoading(false);
  }, [selectedYear]);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setTasksLoading(true);
      setTasksError(null);

      try {
        const [taskRows, projectRows] = await Promise.all([
          getRowsFromDB("task") as Promise<TaskRow[]>,
          getRowsFromDB("project") as Promise<ProjectRow[]>,
        ]);

        if (cancelled) return;

        const projectNameById = new Map<string, string>();
        for (const project of projectRows) {
          projectNameById.set(
            project.id,
            project.title || project.name || "Untitled Project",
          );
        }

        const mapped: WeeklyTask[] = taskRows.map((row) => ({
          id: row.id,
          title: row.title || "Untitled task",
          description: "", // `task` table has no description column
          linkedProject: row.linked_project_id
            ? projectNameById.get(row.linked_project_id) ?? "Unlinked Project"
            : "No linked project",
          dueDate: row.due_date ? new Date(row.due_date) : null,
          status: normalizeStatus(row.status),
          priority: normalizePriority(row.priority),
        }));

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const weekOut = new Date(now);
        weekOut.setDate(weekOut.getDate() + 7);

        const thisWeek = mapped
          .filter((t) => t.status === "pending")
          .filter((t) => !t.dueDate || t.dueDate <= weekOut)
          .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.getTime() - b.dueDate.getTime();
          })
          .slice(0, 5);

        setTasks(thisWeek);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load tasks:", err);
          setTasksError("Couldn't load tasks right now.");
        }
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          {/* 1. Breadcrumbs Wrapper */}
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <DashboardBreadcrumbs items={breadcrumbTrail} />
          </div>

          {/* 2. Main Title - Set to a larger, bolder size */}
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Landing Page
          </h1>

          {/* 3. Subheader - Sized smaller and formatted in light muted slate gray */}
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            All statistics — Overview & Systems Status · {selectedYear}
          </p>
        </div>

        {/* Global Pipeline Year Filter Button Control */}
        <div className="relative self-start sm:self-auto group mb-1">
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

      <DashboardStatsCards
        stats={stats}
        isLoading={isLoading}
        selectedYear={selectedYear}
      />

      <WeeklyTaskList
        tasks={tasks}
        tasksLoading={tasksLoading}
        tasksError={tasksError}
        onToggleTask={toggleTaskStatus}
      />

      {/* Charts and Events Bottom Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ServiceReportsChart
          data={serviceReportsDeliveredByYear}
          selectedYear={selectedYear}
        />

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

        <ProjectDistributionChart
          data={projectStatusDistribution}
          selectedYear={selectedYear}
          totalProjects={totalProjects}
        />
      </div>
    </div>
  );
}