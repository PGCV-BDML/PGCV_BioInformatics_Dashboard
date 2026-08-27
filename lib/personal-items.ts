export type VisibilityFilter = "all" | "team" | "personal";

export const VISIBILITY_FILTER_OPTIONS: {
  value: VisibilityFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "team", label: "Team" },
  { value: "personal", label: "Personal" },
];

export function matchesVisibilityFilter(
  isPersonal: boolean | null | undefined,
  filter: VisibilityFilter,
): boolean {
  if (filter === "personal") return Boolean(isPersonal);
  if (filter === "team") return !isPersonal;
  return true;
}
