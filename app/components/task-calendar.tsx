"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ExternalLink,
  FolderGit2,
  User,
} from "lucide-react";
import { getRowsFromDB, getUsersFromDB, getNameIdFromDB } from "@/lib/supabase";
import type { Task, User as DbUser } from "@/types/database";
import {
  type CalendarTask,
  addMonths,
  getMonthGrid,
  isSameDay,
  mapTasksForCalendar,
  PRIORITY_STYLES,
  STATUS_LABELS,
  taskHref,
  toDateKey,
} from "@/lib/calendar-tasks";
import { formatDate } from "@/lib/utils";
import { ErrorState, LoadingState } from "./state-views";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TaskCalendar() {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [taskRows, projects, users] = await Promise.all([
          getRowsFromDB("task") as Promise<Task[]>,
          getNameIdFromDB("project"),
          getUsersFromDB(["team_lead", "team_member"]),
        ]);

        if (cancelled) return;

        const projectNameById = new Map(
          (projects ?? []).map((p) => [p.id, p.name]),
        );
        const assigneeNameById = new Map(
          ((users ?? []) as DbUser[]).map((u) => [u.id, u.name]),
        );

        setTasks(mapTasksForCalendar(taskRows, projectNameById, assigneeNameById));
      } catch (err) {
        console.error("Failed to load calendar tasks:", err);
        if (!cancelled) {
          setLoadError("Couldn't load calendar tasks. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);
  const today = useMemo(() => new Date(), []);

  const visibleTasks = useMemo(() => {
    if (showCompleted) return tasks;
    return tasks.filter((t) => t.status !== "completed");
  }, [tasks, showCompleted]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of visibleTasks) {
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [visibleTasks]);

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedTasks = selectedKey ? (tasksByDate.get(selectedKey) ?? []) : [];

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthTaskCount = useMemo(() => {
    const prefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
    return visibleTasks.filter((t) => t.due_date.startsWith(prefix)).length;
  }, [visibleTasks, viewMonth]);

  if (isLoading) {
    return (
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-8 shadow-sm">
        <LoadingState message="Loading calendar…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState message={loadError} />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      {/* Month grid */}
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight min-w-[10rem] text-center font-aileron">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(now);
              }}
              className="ml-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] rounded-xl border border-[rgba(42,119,151,0.25)] transition-colors font-quicksand"
            >
              Today
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none font-aileron">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
            />
            Show completed
          </label>
        </div>

        <p className="text-xs text-slate-500 mb-4 font-aileron">
          {monthTaskCount} task{monthTaskCount === 1 ? "" : "s"} with due dates this
          month. Click a day to inspect, or open a task to edit it on the Tasks page.
        </p>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 py-2 font-quicksand"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const key = toDateKey(day);
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[72px] sm:min-h-[88px] rounded-xl border p-1.5 sm:p-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a7797]/40 ${
                  isSelected
                    ? "border-[#2a7797] bg-[#e6f4f8]/80 shadow-sm"
                    : isToday
                      ? "border-[#2a7797]/40 bg-[#fcb016]/5"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full font-aileron ${
                      isToday
                        ? "bg-[#2a7797] text-white"
                        : isSelected
                          ? "text-[#2a7797]"
                          : "text-slate-700"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[9px] font-extrabold text-slate-400 font-quicksand">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1 truncate"
                      title={task.title}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_STYLES[task.priority].dot}`}
                      />
                      <span
                        className={`text-[10px] font-semibold truncate ${
                          task.status === "completed"
                            ? "line-through text-slate-400"
                            : "text-slate-700"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] font-bold text-slate-400 pl-2.5">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </div>
                {/* Mobile: dots only */}
                <div className="flex gap-0.5 mt-1 sm:hidden">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`w-1.5 h-1.5 rounded-full ${PRIORITY_STYLES[task.priority].dot}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-5 sm:p-6 shadow-sm flex flex-col min-h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#2a7797]">
            <CalendarIcon className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-quicksand">
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "Select a day"}
            </h3>
          </div>
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:underline font-quicksand"
          >
            All tasks
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <CheckSquare className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500 font-aileron">
              No tasks due this day
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px] font-aileron">
              Tasks with a due date appear here. Add or edit due dates on the Tasks
              page.
            </p>
            <Link
              href="/dashboard/tasks"
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] rounded-xl border border-[rgba(42,119,151,0.25)] transition-colors font-quicksand"
            >
              Open Tasks
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5 flex-1 overflow-y-auto">
            {selectedTasks.map((task) => {
              const priority = PRIORITY_STYLES[task.priority];
              return (
                <li key={task.id}>
                  <Link
                    href={taskHref(task)}
                    className={`block border rounded-2xl p-3.5 transition-all group ${
                      task.status === "completed"
                        ? "bg-slate-50 border-slate-200 opacity-70"
                        : "bg-surface border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`text-sm font-bold tracking-tight font-aileron ${
                          task.status === "completed"
                            ? "line-through text-slate-400"
                            : "text-slate-800 group-hover:text-[#2a7797]"
                        }`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border font-quicksand ${priority.chip}`}
                      >
                        {priority.label}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-slate-500 font-aileron">
                      <span className="flex items-center gap-1.5 truncate">
                        <FolderGit2 className="w-3 h-3 shrink-0" />
                        {task.projectName}
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        {task.assigneeName}
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-semibold text-slate-600">
                          {STATUS_LABELS[task.status]}
                        </span>
                        <span className="text-slate-400">
                          Due {formatDate(task.due_date)}
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

