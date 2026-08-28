export type InvolvementFilter = "all" | "assigned" | "created";

export const TASK_INVOLVEMENT_FILTER_OPTIONS: {
  value: InvolvementFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned to me" },
  { value: "created", label: "Made by me" },
];

export const REPOSITORY_INVOLVEMENT_FILTER_OPTIONS: {
  value: InvolvementFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "created", label: "Made by me" },
];

export function matchesInvolvementFilter(
  filter: InvolvementFilter,
  userId: string | null | undefined,
  item: {
    ownerId?: string | null;
    assigneeIds?: string[] | null;
  },
): boolean {
  if (filter === "all") return true;
  if (!userId) return false;
  if (filter === "created") return item.ownerId === userId;
  return (item.assigneeIds ?? []).includes(userId);
}
