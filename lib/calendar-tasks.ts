import type { Task, TaskCategory, TaskPriority, TaskStatus } from "@/types/database";

export type CalendarTask = {
  id: string;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string;
  linked_project_id: string;
  linked_analysis_id?: string | null;
  categories: TaskCategory[];
  projectName: string;
  assigneeName: string;
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

/** Normalize a due date to YYYY-MM-DD for date inputs and Postgres `date` columns. */
export function normalizeDueDate(value: string | null | undefined): string | null {
  if (value == null || !String(value).trim()) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const datePart = raw.includes("T") ? raw.split("T")[0]! : raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  return tasks
    .filter((t): t is Task & { due_date: string } => Boolean(t.due_date))
    .map((t) => {
      const projectId = t.linked_project_id ?? "";
      return {
        id: t.id,
        title: t.title || "Untitled task",
        due_date: t.due_date,
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
      };
    });
}

export function tasksInMonth(
  tasks: CalendarTask[],
  viewMonth: Date,
  options?: { includeCompleted?: boolean },
): CalendarTask[] {
  const includeCompleted = options?.includeCompleted ?? false;
  const start = startOfMonth(viewMonth);
  const end = endOfMonth(viewMonth);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);

  return tasks
    .filter((t) => {
      if (!includeCompleted && t.status === "completed") return false;
      return t.due_date >= startKey && t.due_date <= endKey;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
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
    .filter((t) => t.due_date >= todayKey && t.due_date <= endKey)
    .sort((a, b) => {
      const byDate = a.due_date.localeCompare(b.due_date);
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
