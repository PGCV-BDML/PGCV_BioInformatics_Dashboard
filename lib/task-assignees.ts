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

/** Shared group account — not a person, so it is not offered as a new assignee. */
export const TEAM_GROUP_ASSIGNEE_NAME = "Bioinformatics Team";

export function isTeamGroupAssigneeName(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === TEAM_GROUP_ASSIGNEE_NAME.toLowerCase();
}

/**
 * People who can be picked as task assignees. The Bioinformatics Team account
 * is omitted unless it is already on the task (so an existing assignment can
 * still be cleared when editing).
 */
export function assignableTaskUsers<T extends { id: string; name: string }>(
  users: T[],
  selectedIds: string[] = [],
): T[] {
  const selected = new Set(selectedIds);
  return users.filter(
    (user) => selected.has(user.id) || !isTeamGroupAssigneeName(user.name),
  );
}
