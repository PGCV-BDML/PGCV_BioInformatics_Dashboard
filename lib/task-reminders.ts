import {
  formatTaskDateRange,
  formatTaskTimeForInput,
  isClosedTaskStatus,
  resolveTaskStartDate,
  taskHref,
  toDateKey,
} from "@/lib/calendar-tasks";
import { TASK_CATEGORY_LABELS } from "@/lib/task-categories";
import { applyTaskAssignees, resolveTaskAssigneeIds } from "@/lib/task-assignees";
import {
  getRowsFromDB,
  getTaskAssigneesByTaskId,
  getTaskCategoriesByTaskId,
} from "@/lib/supabase";
import type { Task, TaskCategory } from "@/types/database";

/** Calendar-shaped tags: the date means “be there,” not “work started.” */
export const SHOW_UP_CATEGORIES = [
  "tour",
  "events",
  "meeting",
  "training",
] as const satisfies readonly TaskCategory[];

const SHOW_UP_SET = new Set<string>(SHOW_UP_CATEGORIES);

export type ShowUpCategory = (typeof SHOW_UP_CATEGORIES)[number];

export type ComingUpWhen = "today" | "tomorrow";

export type ComingUpTaskInput = {
  id: string;
  title: string | null;
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
  task_time?: string | null;
  details?: string | null;
  status: string;
  categories?: TaskCategory[] | null;
  linked_analysis_id?: string | null;
  assignee_id?: string | null;
  assignee_ids?: string[] | null;
  is_personal?: boolean;
  owner_id?: string | null;
};

export type ComingUpReminder = {
  id: string;
  title: string;
  start_date: string;
  task_time: string | null;
  details: string | null;
  categories: TaskCategory[];
  showUpCategories: ShowUpCategory[];
  when: ComingUpWhen;
  dateLabel: string;
  href: string;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function showUpCategoriesOf(
  categories: TaskCategory[] | null | undefined,
): ShowUpCategory[] {
  return (categories ?? []).filter((category): category is ShowUpCategory =>
    SHOW_UP_SET.has(category),
  );
}

export function comingUpWhenLabel(when: ComingUpWhen): string {
  return when === "today" ? "Today" : "Tomorrow";
}

export function comingUpKindLabel(categories: ShowUpCategory[]): string {
  if (categories.length === 0) return "Upcoming";
  return [...new Set(categories)]
    .map((category) => TASK_CATEGORY_LABELS[category])
    .join(" · ");
}

export type TaskComingUpPayload = {
  task_id?: string;
  title?: string | null;
  start_date?: string | null;
  task_time?: string | null;
  details?: string | null;
  categories?: unknown;
  when?: string | null;
};

export function showUpCategoriesFromPayload(
  categories: unknown,
): ShowUpCategory[] {
  if (!Array.isArray(categories)) return [];
  return showUpCategoriesOf(
    categories.filter((item): item is TaskCategory => typeof item === "string"),
  );
}

export function taskComingUpHref(payload: TaskComingUpPayload): string {
  const taskId = payload.task_id?.trim();
  if (!taskId) return "/dashboard/tasks";
  return taskHref({
    id: taskId,
    title: payload.title?.trim() || "Untitled task",
  });
}

export function taskComingUpWhen(
  payload: TaskComingUpPayload,
  now: Date = new Date(),
): ComingUpWhen | null {
  const start = payload.start_date?.trim();
  if (start) {
    const fromStart = comingUpWhenForStart(start, now);
    if (fromStart) return fromStart;
  }
  if (payload.when === "today" || payload.when === "tomorrow") {
    return payload.when;
  }
  return null;
}

/** Inbox badge + Web Push copy for a stored task_coming_up row. */
export function taskComingUpNotificationCopy(
  payload: TaskComingUpPayload,
  now: Date = new Date(),
): { title: string; body: string; path: string } {
  const when = taskComingUpWhen(payload, now);
  const whenLabel = when ? comingUpWhenLabel(when) : "Upcoming";
  const name = payload.title?.trim() || "Untitled task";
  const kind = comingUpKindLabel(showUpCategoriesFromPayload(payload.categories));
  const time = formatTaskTimeForInput(payload.task_time);
  const bodyParts = [kind === "Upcoming" ? null : kind, time].filter(Boolean);
  return {
    title: `${whenLabel}: ${name}`,
    body: bodyParts.join(" · ") || name,
    path: taskComingUpHref(payload),
  };
}

export function comingUpWindow(now: Date = new Date()): {
  todayKey: string;
  tomorrowKey: string;
} {
  return {
    todayKey: toDateKey(startOfLocalDay(now)),
    tomorrowKey: toDateKey(addLocalDays(now, 1)),
  };
}

export function comingUpWhenForStart(
  startKey: string,
  now: Date = new Date(),
): ComingUpWhen | null {
  const { todayKey, tomorrowKey } = comingUpWindow(now);
  if (startKey === todayKey) return "today";
  if (startKey === tomorrowKey) return "tomorrow";
  return null;
}

function hasLinkedAnalysis(task: ComingUpTaskInput): boolean {
  return Boolean(task.linked_analysis_id?.trim());
}

function isInactiveReminderStatus(status: string): boolean {
  return isClosedTaskStatus(status) || status === "on_hold";
}

export function isComingUpAudience(
  task: ComingUpTaskInput,
  userId: string,
): boolean {
  const trimmed = userId.trim();
  if (!trimmed) return false;
  if (resolveTaskAssigneeIds(task).includes(trimmed)) return true;
  return Boolean(task.is_personal && task.owner_id === trimmed);
}

/**
 * Open show-up tasks assigned to this user whose start is today or tomorrow.
 * Linked sequence-analysis tasks are skipped even if they also carry a meeting tag.
 */
export function selectComingUpTasks(
  tasks: ComingUpTaskInput[],
  userId: string,
  now: Date = new Date(),
): ComingUpReminder[] {
  const reminders: ComingUpReminder[] = [];

  for (const task of tasks) {
    if (isInactiveReminderStatus(task.status)) continue;
    if (hasLinkedAnalysis(task)) continue;
    if (!isComingUpAudience(task, userId)) continue;

    const showUpCategories = showUpCategoriesOf(task.categories);
    if (showUpCategories.length === 0) continue;

    const startKey = resolveTaskStartDate(task);
    if (!startKey) continue;

    const when = comingUpWhenForStart(startKey, now);
    if (!when) continue;

    const title = task.title?.trim() || "Untitled task";
    reminders.push({
      id: task.id,
      title,
      start_date: startKey,
      task_time: task.task_time ?? null,
      details: task.details?.trim() || null,
      categories: task.categories ?? [],
      showUpCategories,
      when,
      dateLabel: formatTaskDateRange(task),
      href: taskHref({ id: task.id, title }),
    });
  }

  return reminders.sort((a, b) => {
    if (a.when !== b.when) return a.when === "today" ? -1 : 1;
    const timeA = formatTaskTimeForInput(a.task_time);
    const timeB = formatTaskTimeForInput(b.task_time);
    if (timeA !== timeB) {
      if (!timeA) return 1;
      if (!timeB) return -1;
      return timeA.localeCompare(timeB);
    }
    return a.title.localeCompare(b.title);
  });
}

export async function getMyComingUpTasks(
  userId: string,
  now: Date = new Date(),
): Promise<ComingUpReminder[]> {
  if (!userId.trim()) return [];

  const [taskRows, categoriesByTask, assigneesByTask] = await Promise.all([
    getRowsFromDB<Task>("task"),
    getTaskCategoriesByTaskId(),
    getTaskAssigneesByTaskId(),
  ]);

  const enriched = applyTaskAssignees(
    taskRows.map((task) => ({
      ...task,
      categories: categoriesByTask.get(task.id) ?? [],
    })),
    assigneesByTask,
  );

  return selectComingUpTasks(enriched, userId, now);
}
