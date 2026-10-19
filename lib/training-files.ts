export type TrainingFileSort = "newest" | "oldest" | "person" | "mine";

export type TrainingFileRecord = {
  id: string;
  title: string | null;
  created_by: string | null;
  created_at?: string | null;
};

const ADDED_EARLIER = "Added earlier";

export function trainingFileRoleLabel(
  role: string | null | undefined,
): string | null {
  if (role === "team_lead" || role === "team_member") return "Team";
  if (role === "trainee") return "Trainee";
  return null;
}

export function formatTrainingFileDate(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Ana Cruz · Team · 19 Oct 2026", or "Added earlier" when nobody was recorded. */
export function trainingFileAttribution(options: {
  name: string | null;
  role: string | null;
  createdAt: string | null | undefined;
}): string {
  const when = formatTrainingFileDate(options.createdAt);
  if (!options.name) {
    return when ? `${ADDED_EARLIER} · ${when}` : ADDED_EARLIER;
  }
  return [options.name, trainingFileRoleLabel(options.role), when]
    .filter(Boolean)
    .join(" · ");
}

function timeOf(file: TrainingFileRecord): number | null {
  if (!file.created_at) return null;
  const time = Date.parse(file.created_at);
  return Number.isFinite(time) ? time : null;
}

function byTitle(a: TrainingFileRecord, b: TrainingFileRecord): number {
  return (a.title ?? "").localeCompare(b.title ?? "", undefined, {
    sensitivity: "base",
  });
}

/** Dated files in the requested direction, then files with no timestamp. */
export function sortTrainingFiles<T extends TrainingFileRecord>(
  files: T[],
  direction: "newest" | "oldest",
): T[] {
  const dated: T[] = [];
  const undated: T[] = [];
  for (const file of files) {
    if (timeOf(file) == null) undated.push(file);
    else dated.push(file);
  }
  dated.sort((a, b) => {
    const delta = (timeOf(a) ?? 0) - (timeOf(b) ?? 0);
    if (delta !== 0) return direction === "oldest" ? delta : -delta;
    return byTitle(a, b);
  });
  undated.sort(byTitle);
  return [...dated, ...undated];
}

export function visibleTrainingFiles<T extends TrainingFileRecord>(
  files: T[],
  sort: TrainingFileSort,
  userId: string | null,
): T[] {
  const pool =
    sort === "mine"
      ? files.filter((file) => file.created_by != null && file.created_by === userId)
      : files;
  return sortTrainingFiles(pool, sort === "oldest" ? "oldest" : "newest");
}

export type TrainingFileGroup<T> = {
  key: string;
  label: string;
  items: T[];
};

export function groupTrainingFilesByPerson<T extends TrainingFileRecord>(
  files: T[],
  labelFor: (file: T) => string,
): TrainingFileGroup<T>[] {
  const groups = new Map<string, TrainingFileGroup<T>>();
  for (const file of sortTrainingFiles(files, "newest")) {
    const key = file.created_by ?? ADDED_EARLIER;
    const label = file.created_by ? labelFor(file) : ADDED_EARLIER;
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(file);
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === ADDED_EARLIER) return 1;
    if (b.key === ADDED_EARLIER) return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}
