import { normalizeTaskDateRange } from "@/lib/calendar-tasks";
import type { Task, TaskRecord } from "@/types/database";

/** Persistable task columns from the task form (excludes tags and analysis link). */
export function buildTaskRecordPayload(
  form: Omit<Task, "id">,
): Partial<TaskRecord> {
  const { categories: _categories, linked_analysis_id: _linkedAnalysis, ...record } =
    form;

  const dates = normalizeTaskDateRange(record.start_date, record.end_date);

  return {
    title: record.title,
    assignee_id: record.assignee_id,
    start_date: dates.start_date,
    end_date: dates.end_date,
    due_date: dates.due_date,
    details: record.details?.trim() || null,
    status: record.status,
    priority: record.priority,
    linked_project_id: record.linked_project_id || null,
    updated_at: new Date().toISOString(),
  };
}
