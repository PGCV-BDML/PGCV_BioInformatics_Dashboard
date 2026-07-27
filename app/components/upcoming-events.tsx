"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  FolderGit2,
  CheckSquare,
} from "lucide-react";
import { getRowsFromDB, getNameIdFromDB, getTaskCategoriesByTaskId } from "@/lib/supabase";
import type { Task } from "@/types/database";
import {
  type CalendarTask,
  mapTasksForCalendar,
  PRIORITY_STYLES,
  taskHref,
  upcomingTasks,
} from "@/lib/calendar-tasks";
import { formatDate } from "@/lib/utils";
import { CategoryChips } from "./category-chips";

export function UpcomingEvents() {
  const [events, setEvents] = useState<CalendarTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [taskRows, projects, categoriesByTask] = await Promise.all([
          getRowsFromDB("task") as Promise<Task[]>,
          getNameIdFromDB("project"),
          getTaskCategoriesByTaskId(),
        ]);

        if (cancelled) return;

        const projectNameById = new Map(
          (projects ?? []).map((p) => [p.id, p.name]),
        );
        const enriched = taskRows.map((t) => ({
          ...t,
          categories: categoriesByTask.get(t.id) ?? [],
        }));
        const mapped = mapTasksForCalendar(
          enriched,
          projectNameById,
          new Map(),
        );
        setEvents(upcomingTasks(mapped, { limit: 6, daysAhead: 31 }));
      } catch (err) {
        console.error("Failed to load upcoming events:", err);
        if (!cancelled) {
          setError("Couldn't load upcoming due dates.");
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

  return (
    <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.1)] xl:row-span-2 flex flex-col">
      <div className="flex items-center justify-between mb-6 font-quicksand">
        <div className="flex items-center gap-2 text-[#2a7797]">
          <Calendar className="w-4 h-4" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider">
            Upcoming Due Dates
          </h3>
        </div>
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#2a7797] bg-[#e6f4f8] hover:bg-[#d5eff6] transition-colors duration-200 px-3 py-1.5 rounded-xl border border-[rgba(42,119,151,0.25)] shadow-[0_4px_10px_rgba(15,23,42,0.04)]"
        >
          <span>Calendar</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 space-y-3">
        {isLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[64px] rounded-2xl bg-slate-100/70 border border-slate-200 animate-pulse"
              />
            ))}
          </>
        )}

        {!isLoading && error && (
          <div className="text-xs font-semibold text-red-500 p-4">{error}</div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-slate-100 border border-slate-200 shadow-inner">
              <CheckSquare className="w-6 h-6 text-[#7a8e9b]" />
            </div>
            <p className="text-xs font-semibold text-slate-500 font-aileron">
              No upcoming due dates
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] font-aileron">
              Open tasks and set due dates to see them here and on the calendar.
            </p>
            <Link
              href="/dashboard/tasks"
              className="mt-4 text-[11px] font-bold text-[#2a7797] hover:underline font-quicksand"
            >
              Go to Tasks
            </Link>
          </div>
        )}

        {!isLoading &&
          !error &&
          events.map((task) => {
            const priority = PRIORITY_STYLES[task.priority];
            return (
              <Link
                key={task.id}
                href={taskHref(task)}
                className="border border-slate-300 rounded-2xl p-4 flex flex-col gap-2 bg-surface shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:border-slate-400 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-[#2a7797] font-aileron">
                    {task.title}
                  </span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border font-quicksand ${priority.chip}`}
                  >
                    {priority.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-aileron">
                  <span className="flex items-center gap-1.5 text-[#2a7797] font-bold truncate min-w-0">
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{task.projectName}</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1 text-slate-500 font-semibold">
                    <Calendar className="w-3 h-3" />
                    {formatDate(task.due_date)}
                  </span>
                </div>
                <CategoryChips categories={task.categories} maxVisible={2} />
              </Link>
            );
          })}
      </div>
    </div>
  );
}
