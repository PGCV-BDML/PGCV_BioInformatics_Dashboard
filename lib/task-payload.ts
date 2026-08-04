import { normalizeDueDate } from "@/lib/calendar-tasks";
import type { Task, TaskRecord } from "@/types/database";

/** Persistable task columns from the task form (excludes tags and analysis link). */
export function buildTaskRecordPayload(
  form: Omit<Task, "id">,
): Partial<TaskRecord> {
  const { categories: _categories, linked_analysis_id: _linkedAnalysis, ...record } =
    form;

  return {
    title: record.title,
    assignee_id: record.assignee_id,
    due_date: normalizeDueDate(record.due_date),
    status: record.status,
    priority: record.priority,
    linked_project_id: record.linked_project_id || null,
    updated_at: new Date().toISOString(),
  };
}
