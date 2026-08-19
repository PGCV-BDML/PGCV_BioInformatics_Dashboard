import {
  normalizeTaskDateRange,
  normalizeTaskTime,
} from "@/lib/calendar-tasks";
import {
  primaryAssigneeId,
  resolveTaskAssigneeIds,
} from "@/lib/task-assignees";
import type { Task, TaskRecord } from "@/types/database";

/** Persistable task columns from the task form (excludes tags, assignees, and analysis link). */
export function buildTaskRecordPayload(
  form: Omit<Task, "id">,
): Partial<TaskRecord> {
  const {
    categories: _categories,
    assignee_ids: _assigneeIds,
    linked_analysis_id: _linkedAnalysis,
    ...record
  } = form;

  const dates = normalizeTaskDateRange(record.start_date, record.end_date);
  const assigneeIds = resolveTaskAssigneeIds(form);

  return {
    title: record.title,
    assignee_id: primaryAssigneeId(assigneeIds),
    start_date: dates.start_date,
    end_date: dates.end_date,
    due_date: dates.due_date,
    task_time: normalizeTaskTime(record.task_time),
    details: record.details?.trim() || null,
    status: record.status,
    priority: record.priority,
    linked_project_id: record.linked_project_id || null,
    updated_at: new Date().toISOString(),
  };
}
