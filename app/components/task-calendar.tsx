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
  UserRound,
} from "lucide-react";
import {
  getRowsFromDB,
  getTeamDirectoryUsers,
  getNameIdFromDB,
  getTaskCategoriesByTaskId,
  getTaskAssigneesByTaskId,
} from "@/lib/supabase";
import type {
  Task,
  TaskCategory,
  User as DbUser,
  UserAbsence,
  PresenceStatus,
} from "@/types/database";
import {
  type CalendarTask,
  addMonths,
  buildTasksByDate,
  filterByCategory,
  formatTaskDateRange,
  formatTaskTimeForInput,
  getMonthGrid,
  isSameDay,
  mapTasksForCalendar,
  PRIORITY_STYLES,
  splitCellPreview,
  STATUS_LABELS,
  taskHref,
  toDateKey,
} from "@/lib/calendar-tasks";
import {
  type CalendarAbsence,
  ABSENCE_STATUS_STYLES,
  absenceStatusLabel,
  absencesByDateKey,
  filterAbsencesByStatus,
  mapAbsencesForCalendar,
} from "@/lib/calendar-absences";
import { PRESENCE_STATUS_OPTIONS } from "@/types/database";
import { TASK_CATEGORY_OPTIONS } from "@/lib/task-categories";
import { applyTaskAssignees } from "@/lib/task-assignees";
import { ErrorState, LoadingState } from "./state-views";
import { TaskCategoryChips as CategoryChips } from "./category-chips";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TaskCalendar() {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [absences, setAbsences] = useState<CalendarAbsence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTeamAbsences, setShowTeamAbsences] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "All">("All");
  const [absenceFilter, setAbsenceFilter] = useState<PresenceStatus | "All">("All");
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [taskRows, projects, users, categoriesByTask, assigneesByTask, absenceRows] =
          await Promise.all([
          getRowsFromDB("task") as Promise<Task[]>,
          getNameIdFromDB("project"),
          getTeamDirectoryUsers<DbUser>(),
          getTaskCategoriesByTaskId(),
          getTaskAssigneesByTaskId(),
          getRowsFromDB<UserAbsence>("user_absence"),
        ]);

        if (cancelled) return;

        const projectNameById = new Map(
          (projects ?? []).map((p) => [p.id, p.name]),
        );
        const assigneeNameById = new Map(
          ((users ?? []) as DbUser[]).map((u) => [u.id, u.name]),
        );

        const enriched = applyTaskAssignees(
          taskRows.map((t) => ({
            ...t,
            categories: categoriesByTask.get(t.id) ?? [],
          })),
          assigneesByTask,
        );

        setTasks(mapTasksForCalendar(enriched, projectNameById, assigneeNameById));
        setAbsences(
          mapAbsencesForCalendar(absenceRows, assigneeNameById),
        );
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
    let list = showCompleted
      ? tasks
      : tasks.filter((t) => t.status !== "completed");
    list = filterByCategory(list, categoryFilter);
    return list;
  }, [tasks, showCompleted, categoryFilter]);

  const visibleAbsences = useMemo(() => {
    if (!showTeamAbsences) return [];
    return filterAbsencesByStatus(absences, absenceFilter);
  }, [absences, showTeamAbsences, absenceFilter]);

  const tasksByDate = useMemo(
    () => buildTasksByDate(visibleTasks),
    [visibleTasks],
  );

  const absencesByDate = useMemo(
    () => absencesByDateKey(visibleAbsences),
    [visibleAbsences],
  );

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedTasks = selectedKey ? (tasksByDate.get(selectedKey) ?? []) : [];
  const selectedAbsences = selectedKey
    ? (absencesByDate.get(selectedKey) ?? [])
    : [];

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] 2xl:grid-cols-[1fr_400px] gap-6 items-start">
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

          <div className="grid grid-cols-[auto_minmax(8rem,11rem)_auto] gap-x-3 gap-y-2.5 items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-quicksand w-16 shrink-0">
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as TaskCategory | "All")
              }
              className="h-8 w-full px-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#4ec2bb]/30"
            >
              <option value="All">All</option>
              {TASK_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none font-aileron whitespace-nowrap">
              <input
                type="checkbox"
                checked={showTeamAbsences}
                onChange={(e) => setShowTeamAbsences(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
              />
              Show team absences
            </label>

            {showTeamAbsences ? (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-quicksand w-16 shrink-0">
                  Absence
                </span>
                <select
                  value={absenceFilter}
                  onChange={(e) =>
                    setAbsenceFilter(e.target.value as PresenceStatus | "All")
                  }
                  className="h-8 w-full px-2 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#4ec2bb]/30"
                >
                  <option value="All">All</option>
                  {PRESENCE_STATUS_OPTIONS.filter((opt) =>
                    ["on_leave", "on_travel", "unavailable", "in_meeting"].includes(
                      opt.value,
                    ),
                  ).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className="invisible w-16 shrink-0" aria-hidden>
                  Absence
                </span>
                <span aria-hidden />
              </>
            )}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none font-aileron whitespace-nowrap">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#2a7797] focus:ring-[#2a7797]"
              />
              Show completed
            </label>
          </div>
        </div>

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
            const dayAbsences = absencesByDate.get(key) ?? [];
            const dayCount = dayTasks.length + dayAbsences.length;
            const preview = splitCellPreview(dayAbsences.length, dayTasks.length);
            const hiddenCount = dayCount - preview.absences - preview.tasks;
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-stretch min-h-[96px] sm:min-h-[124px] rounded-xl border p-1.5 sm:p-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a7797]/40 ${
                  isSelected
                    ? "border-[#2a7797] bg-[#e6f4f8]/80 shadow-sm"
                    : isToday
                      ? "border-[#2a7797]/40 bg-[#fcb016]/5"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <span
                    className={`shrink-0 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full font-aileron ${
                      isToday
                        ? "bg-[#2a7797] text-white"
                        : isSelected
                          ? "text-[#2a7797]"
                          : "text-slate-700"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayCount > 0 && (
                    <span className="text-[9px] font-extrabold text-slate-400 font-quicksand">
                      {dayCount}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  {dayAbsences.slice(0, preview.absences).map((absence) => (
                    <div
                      key={absence.id}
                      className="flex items-center gap-1 truncate"
                      title={`${absence.user_name} — ${absenceStatusLabel(absence.status)}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${ABSENCE_STATUS_STYLES[absence.status].dot}`}
                      />
                      <span className="text-[10px] font-semibold truncate text-amber-800">
                        {absence.user_name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                  {dayTasks.slice(0, preview.tasks).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1 truncate"
                      title={
                        formatTaskTimeForInput(task.task_time)
                          ? `${formatTaskTimeForInput(task.task_time)} ${task.title}`
                          : task.title
                      }
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
                        {formatTaskTimeForInput(task.task_time)
                          ? `${formatTaskTimeForInput(task.task_time)} ${task.title}`
                          : task.title}
                      </span>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 pl-2.5">
                      +{hiddenCount} more
                    </span>
                  )}
                </div>
                {/* Mobile: dots only */}
                <div className="flex gap-0.5 mt-1 sm:hidden">
                  {dayAbsences.slice(0, 1).map((absence) => (
                    <span
                      key={absence.id}
                      className={`w-1.5 h-1.5 rounded-full ${ABSENCE_STATUS_STYLES[absence.status].dot}`}
                    />
                  ))}
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

      {/* Day detail panel — sticks beside the grid and scrolls on its own */}
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-5 sm:p-6 shadow-sm flex flex-col min-h-[320px] xl:sticky xl:top-20 xl:max-h-[calc(100vh-7rem)]">
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
            href="/dashboard/team"
            className="flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:underline font-quicksand"
          >
            Team
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {selectedTasks.length === 0 && selectedAbsences.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <CheckSquare className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500 font-aileron">
              Nothing scheduled this day
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] font-aileron">
              Tasks with dates and team leave/travel days appear here.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] rounded-xl border border-[rgba(42,119,151,0.25)] transition-colors font-quicksand"
              >
                Open Tasks
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/dashboard/team"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors font-quicksand"
              >
                Open Team
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5 flex-1 overflow-y-auto">
            {selectedAbsences.map((absence) => {
              const style = ABSENCE_STATUS_STYLES[absence.status];
              return (
                <li key={absence.id}>
                  <div className="border rounded-2xl p-3.5 bg-amber-50/40 border-amber-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserRound className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="text-sm font-bold text-slate-800 font-aileron truncate">
                          {absence.user_name}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border font-quicksand ${style.chip}`}
                      >
                        {absenceStatusLabel(absence.status)}
                      </span>
                    </div>
                    {absence.note ? (
                      <p className="text-[11px] text-slate-500 font-aileron line-clamp-2">
                        {absence.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {selectedTasks.map((task) => {
              const priority = PRIORITY_STYLES[task.priority];
              return (
                <li key={task.id}>
                  <div
                    className={`border rounded-2xl p-3.5 transition-all ${
                      task.status === "completed"
                        ? "bg-slate-50 border-slate-200 opacity-70"
                        : "bg-surface border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link
                        href={taskHref(task)}
                        className={`text-sm font-bold tracking-tight font-aileron hover:underline ${
                          task.status === "completed"
                            ? "line-through text-slate-400"
                            : "text-slate-800 hover:text-[#2a7797]"
                        }`}
                      >
                        {task.title}
                      </Link>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border font-quicksand ${priority.chip}`}
                      >
                        {priority.label}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-slate-500 font-aileron">
                      <CategoryChips categories={task.categories} maxVisible={3} />
                      <span className="flex items-center gap-1.5 truncate">
                        <FolderGit2 className="w-3 h-3 shrink-0" />
                        {task.projectName}
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        {task.assigneeName}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <Link
                          href={taskHref(task)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:underline font-quicksand"
                        >
                          Open task
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        {task.linked_analysis_id && (
                          <Link
                            href={`/dashboard/services/${task.linked_analysis_id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:underline font-quicksand"
                          >
                            Open analysis
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-semibold text-slate-600">
                          {STATUS_LABELS[task.status]}
                        </span>
                        <span className="text-slate-400">
                          {formatTaskDateRange(task)}
                        </span>
                      </span>
                      {task.details ? (
                        <p className="text-[11px] text-slate-500 font-aileron line-clamp-2">
                          {task.details}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

