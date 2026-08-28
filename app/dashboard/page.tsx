"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Dna,
  FolderGit2,
  Plus,
} from "lucide-react";
import { DashboardBreadcrumbs } from "../components/dashboardbreadcrumbs";
import { DashboardStatsCards } from "../components/dashboard-stat-cards";
import { routes } from "@/lib/routes";
import {
  arrangeAfterStatusToggle,
  sortTasksForDisplay,
  WeeklyTaskList,
} from "../components/weekly-task-list";
import { UpcomingEvents } from "../components/upcoming-events";
import { ServiceReportsChart } from "../components/service-reports-chart";
import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import { getDashboardStats, getServiceReportsByYear, type DashboardStats } from "@/lib/dashboard-stats";
import { formatAnalysisYearLabel } from "@/lib/analysis-dashboard-stats";
import {
  endOfWeek,
  formatTaskDateRange,
  resolveTaskEndDate,
  resolveTaskStartDate,
  startOfWeek,
  taskOverlapsRange,
  toDateKey,
} from "@/lib/calendar-tasks";
import { ErrorState } from "../components/state-views";
interface TaskRow {
  id: string;
  title: string | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  task_time?: string | null;
  status: string;
  priority: string;
}
interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  status: "pending" | "completed";
  priority: "high" | "medium" | "low";
}

const AVAILABLE_YEARS = ["all", "2024", "2025", "2026"];

function normalizePriority(raw: string | null | undefined): WeeklyTask["priority"] {
  const value = (raw ?? "").toLowerCase().trim();
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function normalizeStatus(raw: string | null | undefined): WeeklyTask["status"] {
  const value = (raw ?? "").toLowerCase().trim();
  if (value === "completed" || value === "finished") return "completed";
  return "pending";
}

export default function DashboardLandingPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [serviceReportsData, setServiceReportsData] = useState<{ year: string; Delivered: number }[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Breadcrumb trail where "Dashboard" is the first element, and "Home" is second and hoverable
  const breadcrumbTrail = [
    { label: "Dashboard" },
    { label: "Overview", href: "/dashboard" },
  ];

  const toggleTaskStatus = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const nextStatus: WeeklyTask["status"] =
      target.status === "completed" ? "pending" : "completed";

    // Optimistic UI update — pending first; newly completed goes to absolute bottom
    setTasks((prevTasks) =>
      arrangeAfterStatusToggle(
        prevTasks.map((task) =>
          task.id === id ? { ...task, status: nextStatus } : task,
        ),
        id,
      ),
    );

    try {
      await saveDataToDB("task", id, { status: nextStatus });
    } catch (err) {
      console.error("Failed to update task status:", err);
      // roll back on failure and restore pending-first order
      setTasks((prevTasks) =>
        sortTasksForDisplay(
          prevTasks.map((task) =>
            task.id === id ? { ...task, status: target.status } : task,
          ),
        ),
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setIsLoading(true);
      setStatsError(null);

      try {
        const [statsData, reportsData] = await Promise.all([
          getDashboardStats(selectedYear),
          getServiceReportsByYear(),
        ]);

        if (!cancelled) {
          setStats(statsData);
          setServiceReportsData(reportsData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load dashboard stats:", err);
          setStatsError("Couldn't load dashboard statistics right now.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setTasksLoading(true);
      setTasksError(null);

      try {
        const taskRows = await (getRowsFromDB("task") as Promise<TaskRow[]>);

        if (cancelled) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const weekStartKey = toDateKey(startOfWeek(now));
        const weekEndKey = toDateKey(endOfWeek(now));

        const sortByStartDate = (
          a: { startKey: string | null },
          b: { startKey: string | null },
        ) => {
          if (!a.startKey && !b.startKey) return 0;
          if (!a.startKey) return 1;
          if (!b.startKey) return -1;
          return a.startKey.localeCompare(b.startKey);
        };

        const thisWeekRows = taskRows
          .filter((row) => row.status !== "cancelled")
          .map((row) => ({
            id: row.id,
            title: row.title || "Untitled task",
            description: "",
            dateLabel: formatTaskDateRange(row),
            status: normalizeStatus(row.status),
            priority: normalizePriority(row.priority),
            startKey: resolveTaskStartDate(row),
            endKey: resolveTaskEndDate(row),
          }))
          .filter(
            (t) =>
              !t.startKey ||
              taskOverlapsRange(t.startKey, t.endKey, weekStartKey, weekEndKey),
          );

        const pendingThisWeek = thisWeekRows
          .filter((t) => t.status === "pending")
          .sort(sortByStartDate)
          .slice(0, 5);

        const completedThisWeek = thisWeekRows
          .filter((t) => t.status === "completed")
          .sort(sortByStartDate);

        const thisWeek = sortTasksForDisplay(
          [...pendingThisWeek, ...completedThisWeek].map(
            ({ startKey: _s, endKey: _e, ...task }) => task,
          ),
        );

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

  const serviceReportsDeliveredByYear = serviceReportsData;

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header Controls Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <DashboardBreadcrumbs items={breadcrumbTrail} />
          </div>

          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Overview
          </h1>

          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Service reports, trainings & internships · weekly tasks · report trends ·{" "}
            {formatAnalysisYearLabel(selectedYear)}
          </p>
        </div>

        <div className="relative self-start sm:self-auto group mb-1">
          <div className="flex items-center gap-2 bg-surface group-hover:bg-slate-50 transition-colors duration-150 border border-slate-300 rounded-xl px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-left pointer-events-none">
            <Calendar className="w-3.5 h-3.5 text-[#2a7797]" />
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-quicksand select-none">
              Filtered Year:
            </span>
            <span className="text-xs font-bold text-[#174e64] font-quicksand">
              {formatAnalysisYearLabel(selectedYear)}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#174e64] ml-1" />
          </div>

          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-bold text-xs font-quicksand"
            aria-label="Filter overview by year"
          >
            {AVAILABLE_YEARS.map((year) => (
              <option
                key={year}
                value={year}
                className="bg-white text-slate-700 font-medium font-quicksand"
              >
                {formatAnalysisYearLabel(year)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="relative overflow-hidden w-full rounded-3xl px-6 py-5 md:px-8 md:py-7 shadow-[0_10px_28px_rgba(15,23,42,0.09)] border border-slate-300 bg-gradient-to-tr from-[#f9f5eb] via-[#fdfdfd] to-[#e1f1f5] flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-1.5 max-w-2xl z-10">
          <span className="text-[11px] font-bold tracking-[1.8px] uppercase text-[#2a7797] font-quicksand block">
            Internal Operations Hub
          </span>

          <h2 className="text-2xl md:text-[32px] font-black text-slate-800 leading-snug tracking-tight font-aileron">
            Bioinformatics Workflow Dashboard
          </h2>

          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-xl font-aileron">
            One internal workspace for service tracking, training, internships,
            collaborations, projects, accomplishments, documents, and repository
            links.
          </p>
        </div>

        <div className="flex-shrink-0 z-10">
          <img
            src="/assets/pgcv_logo.png"
            alt="Philippine Genome Center Visayas logo"
            className="h-16 md:h-20 w-auto object-contain"
          />
        </div>

        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-200/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <nav
        aria-label="Quick actions"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          {
            href: routes.services.trackerAdd,
            label: "Add analysis",
            hint: "Open the tracker and start a new record",
            icon: Dna,
            add: true,
            tone: {
              well: "bg-[#e6f4f8] text-[#2a7797] group-hover:bg-[#2a7797] group-hover:text-white",
              plus: "bg-[#2a7797] text-white",
              hover: "hover:border-[#2a7797]/50",
            },
          },
          {
            href: routes.repositories.list,
            label: "Repositories",
            hint: "Browse pipeline, run, and document links",
            icon: FolderGit2,
            add: false,
            tone: {
              well: "bg-[#eceaf5] text-[#282560] group-hover:bg-[#282560] group-hover:text-white",
              plus: "",
              hover: "hover:border-[#282560]/45",
            },
          },
          {
            href: routes.tasks.add,
            label: "Add tasks",
            hint: "Open Tasks and start a new item",
            icon: CheckSquare,
            add: true,
            tone: {
              well: "bg-[#eef7ea] text-[#4f8a3e] group-hover:bg-[#6bb155] group-hover:text-white",
              plus: "bg-[#6bb155] text-white",
              hover: "hover:border-[#6bb155]/55",
            },
          },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex items-center gap-4 rounded-2xl border border-slate-300 bg-surface px-5 py-4 shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a7797]/40 transition-all ${action.tone.hover}`}
            >
              <span
                className={`relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl transition-colors ${action.tone.well}`}
              >
                <Icon className="h-7 w-7" strokeWidth={1.75} />
                {action.add ? (
                  <span
                    className={`absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${action.tone.plus}`}
                    aria-hidden
                  >
                    <Plus className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-slate-800 font-aileron">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400 font-medium leading-snug font-aileron">
                  {action.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {statsError ? (
        <ErrorState message={statsError} />
      ) : (
        <DashboardStatsCards
          stats={stats}
          isLoading={isLoading}
          selectedYear={selectedYear}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <WeeklyTaskList
          tasks={tasks}
          tasksLoading={tasksLoading}
          tasksError={tasksError}
          onToggleTask={toggleTaskStatus}
        />
        <UpcomingEvents />
      </div>

      <ServiceReportsChart
        data={serviceReportsDeliveredByYear}
        selectedYear={selectedYear}
        onYearChange={(year) => {
          if (AVAILABLE_YEARS.includes(year)) setSelectedYear(year);
        }}
      />
    </div>
  );
}