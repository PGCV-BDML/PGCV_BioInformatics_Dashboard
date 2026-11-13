import type { TrainingProgramStatus } from "@/types/database";

type SortableProgram = {
  title: string;
  status: TrainingProgramStatus;
  start_date: string;
  /** Empty when the program is not pinned. */
  pinned_at: string;
};

const STATUS_RANK: Record<TrainingProgramStatus, number> = {
  ongoing: 0,
  draft: 1,
  completed: 2,
  archived: 3,
};

/** Programs with no start date go after dated ones. */
function compareStartDates(a: string, b: string, soonestFirst: boolean): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return soonestFirst ? a.localeCompare(b) : b.localeCompare(a);
}

/**
 * Directory order: pinned programs first (most recently pinned on top), then
 * On-going, Upcoming, Completed, and Archived. Upcoming programs show the
 * soonest start first; the others show the newest start first.
 */
export function sortPrograms<T extends SortableProgram>(programs: T[]): T[] {
  return [...programs].sort((a, b) => {
    if (a.pinned_at || b.pinned_at) {
      if (!a.pinned_at) return 1;
      if (!b.pinned_at) return -1;
      // Browser and database timestamps are formatted differently.
      const byPin = Date.parse(b.pinned_at) - Date.parse(a.pinned_at);
      if (byPin) return byPin;
    }
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    const byDate = compareStartDates(
      a.start_date,
      b.start_date,
      a.status === "draft",
    );
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });
}
