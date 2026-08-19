import type { Task } from "@/types/database";

function cleanIds(ids: string[] | null | undefined): string[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Prefer the junction list (including empty = unassigned); else fall back to assignee_id. */
export function resolveTaskAssigneeIds(task: {
  assignee_id?: string | null;
  assignee_ids?: string[] | null;
}): string[] {
  if (task.assignee_ids != null) return cleanIds(task.assignee_ids);
  if (task.assignee_id?.trim()) return [task.assignee_id.trim()];
  return [];
}

export function primaryAssigneeId(ids: string[]): string | null {
  return ids[0] ?? null;
}

export function formatAssigneeNames(
  ids: string[],
  nameById: Map<string, string>,
): string {
  if (ids.length === 0) return "Unassigned";
  return ids.map((id) => nameById.get(id) ?? "Unknown").join(", ");
}

export function applyTaskAssignees(
  tasks: Task[],
  assigneesByTask: Map<string, string[]>,
): Task[] {
  return tasks.map((task) => {
    const assignee_ids =
      assigneesByTask.get(task.id) ??
      (task.assignee_id ? [task.assignee_id] : []);
    return {
      ...task,
      assignee_ids,
      assignee_id: primaryAssigneeId(assignee_ids),
    };
  });
}
