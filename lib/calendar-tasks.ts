import type { Task, TaskCategory, TaskPriority, TaskStatus } from "@/types/database";
import { formatDate } from "@/lib/utils";

export type CalendarTask = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  details: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string;
  linked_project_id: string;
  linked_analysis_id?: string | null;
  categories: TaskCategory[];
  projectName: string;
  assigneeName: string;
};

type TaskDateFields = {
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
};

/** Parse a YYYY-MM-DD string as a local calendar date (avoids UTC shift). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Format a Date as YYYY-MM-DD in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normalize a task date to YYYY-MM-DD for date inputs and Postgres `date` columns. */
export function normalizeDueDate(value: string | null | undefined): string | null {
  if (value == null || !String(value).trim()) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const datePart = raw.includes("T") ? raw.split("T")[0]! : raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

export function resolveTaskStartDate(task: TaskDateFields): string | null {
  return normalizeDueDate(task.start_date) ?? normalizeDueDate(task.due_date);
}

export function resolveTaskEndDate(task: TaskDateFields): string | null {
  const start = resolveTaskStartDate(task);
  return normalizeDueDate(task.end_date) ?? start;
}

/** Normalize form/DB dates into a persisted range; due_date mirrors end_date. */
export function normalizeTaskDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): {
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
} {
  const start_date = normalizeDueDate(start);
  if (!start_date) {
    return { start_date: null, end_date: null, due_date: null };
  }

  const endRaw = normalizeDueDate(end);
  const end_date =
    endRaw && endRaw >= start_date ? endRaw : start_date;

  return {
    start_date,
    end_date,
    due_date: end_date,
  };
}

/** Values for task modal date inputs. */
export function taskFormDatesFromTask(task: TaskDateFields): {
  start_date: string;
  end_date: string;
} {
  const start_date = resolveTaskStartDate(task) ?? "";
  const end = resolveTaskEndDate(task);
  const end_date = end && end !== start_date ? end : "";
  return { start_date, end_date };
}

export function taskOverlapsRange(
  startKey: string | null,
  endKey: string | null,
  windowStart: string,
  windowEnd: string,
): boolean {
  if (!startKey) return false;
  const end = endKey ?? startKey;
  return startKey <= windowEnd && end >= windowStart;
}

/** Inclusive list of YYYY-MM-DD keys from start through end. */
export function eachDateKeyInRange(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = parseLocalDate(startKey);
  const end = parseLocalDate(endKey);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    );
  }

  return keys;
}

export function formatTaskDateRange(task: TaskDateFields): string {
  const start = resolveTaskStartDate(task);
  const end = resolveTaskEndDate(task);
  if (!start) return "";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function buildTasksByDate(
  tasks: CalendarTask[],
): Map<string, CalendarTask[]> {
  const map = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    for (const key of eachDateKeyInRange(task.start_date, task.end_date)) {
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
  }
  return map;
}

/** Entries a day cell previews before collapsing the rest into "+N more". */
export const MAX_CELL_ENTRIES = 4;

/**
 * Divide a day cell's preview slots between absences and tasks. Absences lead,
 * but always leave room for two tasks when the day has both, and any slot the
 * other kind cannot use is handed back so the cell stays full.
 */
export function splitCellPreview(
  absenceCount: number,
  taskCount: number,
  maxEntries: number = MAX_CELL_ENTRIES,
): { absences: number; tasks: number } {
  const absences = Math.min(
    absenceCount,
    Math.max(maxEntries - taskCount, maxEntries - 2),
  );
  return { absences, tasks: Math.min(taskCount, maxEntries - absences) };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Sunday-start week (matches calendar month grid). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Inclusive Saturday end of the Sunday-start week. */
export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Build a 6×7 grid of dates covering the visible month (Sun–Sat). */
export function getMonthGrid(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // back to Sunday

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function taskHref(task: Pick<CalendarTask, "id" | "title">): string {
  const params = new URLSearchParams();
  params.set("task", task.id);
  params.set("search", task.title);
  return `/dashboard/tasks?${params.toString()}`;
}

export function mapTasksForCalendar(
  tasks: Task[],
  projectNameById: Map<string, string>,
  assigneeNameById: Map<string, string>,
): CalendarTask[] {
  const mapped: CalendarTask[] = [];

  for (const t of tasks) {
    const start = resolveTaskStartDate(t);
    const end = resolveTaskEndDate(t);
    if (!start || !end) continue;

    const projectId = t.linked_project_id ?? "";
    mapped.push({
      id: t.id,
      title: t.title || "Untitled task",
      start_date: start,
      end_date: end,
      details: t.details?.trim() || null,
      status: t.status,
      priority: t.priority,
      assignee_id: t.assignee_id,
      linked_project_id: projectId,
      linked_analysis_id: t.linked_analysis_id ?? null,
      categories: t.categories ?? [],
      projectName: projectId
        ? (projectNameById.get(projectId) ?? "Unlinked project")
        : "No linked project",
      assigneeName: assigneeNameById.get(t.assignee_id) ?? "Unassigned",
    });
  }

  return mapped;
}

export function tasksInMonth(
  tasks: CalendarTask[],
  viewMonth: Date,
  options?: { includeCompleted?: boolean },
): CalendarTask[] {
  const includeCompleted = options?.includeCompleted ?? false;
  const startKey = toDateKey(startOfMonth(viewMonth));
  const endKey = toDateKey(endOfMonth(viewMonth));

  return tasks
    .filter((t) => {
      if (!includeCompleted && t.status === "completed") return false;
      return taskOverlapsRange(t.start_date, t.end_date, startKey, endKey);
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function upcomingTasks(
  tasks: CalendarTask[],
  options?: { limit?: number; daysAhead?: number },
): CalendarTask[] {
  const limit = options?.limit ?? 6;
  const daysAhead = options?.daysAhead ?? 31;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);
  const endKey = toDateKey(end);

  return tasks
    .filter((t) => t.status !== "completed")
    .filter((t) =>
      taskOverlapsRange(t.start_date, t.end_date, todayKey, endKey),
    )
    .sort((a, b) => {
      const byDate = a.start_date.localeCompare(b.start_date);
      if (byDate !== 0) return byDate;
      const priorityWeight: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      return (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
    })
    .slice(0, limit);
}

export function filterByCategory(
  tasks: CalendarTask[],
  category: TaskCategory | "All",
): CalendarTask[] {
  if (category === "All") return tasks;
  return tasks.filter((t) => t.categories.includes(category));
}

export const PRIORITY_STYLES: Record<
  TaskPriority,
  { chip: string; dot: string; label: string }
> = {
  high: {
    chip: "bg-red-50 text-red-700 border-red-200/60",
    dot: "bg-red-500",
    label: "High",
  },
  medium: {
    chip: "bg-amber-50 text-amber-700 border-amber-200/60",
    dot: "bg-amber-500",
    label: "Medium",
  },
  low: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    dot: "bg-emerald-500",
    label: "Low",
  },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};
