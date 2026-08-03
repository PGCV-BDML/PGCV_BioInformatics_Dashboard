import type { PresenceStatus, UserAbsence } from "@/types/database";
import { PRESENCE_STATUS_OPTIONS } from "@/types/database";
import { toDateKey } from "@/lib/calendar-tasks";

export type CalendarAbsence = {
  id: string;
  user_id: string;
  user_name: string;
  absence_date: string;
  status: PresenceStatus;
  note: string | null;
};

export const ABSENCE_STATUS_STYLES: Record<
  PresenceStatus,
  { label: string; dot: string; chip: string }
> = {
  in_office: {
    label: "In office",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  in_lab: {
    label: "In lab",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-100",
  },
  remote: {
    label: "Remote",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 border-violet-100",
  },
  on_leave: {
    label: "On leave",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 border-amber-100",
  },
  on_travel: {
    label: "On travel",
    dot: "bg-orange-500",
    chip: "bg-orange-50 text-orange-800 border-orange-100",
  },
  in_meeting: {
    label: "In meeting",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-100",
  },
};

export function absenceStatusLabel(status: PresenceStatus): string {
  return (
    PRESENCE_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    ABSENCE_STATUS_STYLES[status]?.label ??
    status
  );
}

export function mapAbsencesForCalendar(
  rows: UserAbsence[],
  userNameById: Map<string, string>,
): CalendarAbsence[] {
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_name: userNameById.get(row.user_id) ?? "Team member",
    absence_date: row.absence_date,
    status: row.status,
    note: row.note,
  }));
}

export function filterAbsencesByStatus(
  absences: CalendarAbsence[],
  status: PresenceStatus | "All",
): CalendarAbsence[] {
  if (status === "All") return absences;
  return absences.filter((a) => a.status === status);
}

/** Sort and dedupe YYYY-MM-DD strings. */
export function normalizeAbsenceDates(dates: string[]): string[] {
  const unique = Array.from(
    new Set(dates.map((d) => d.trim()).filter(Boolean)),
  );
  return unique.sort((a, b) => a.localeCompare(b));
}

/** Latest date in a list, for syncing user_presence.until_date. */
export function maxAbsenceDate(dates: string[]): string | null {
  const normalized = normalizeAbsenceDates(dates);
  return normalized.length > 0 ? normalized[normalized.length - 1]! : null;
}

export function absencesByDateKey(
  absences: CalendarAbsence[],
): Map<string, CalendarAbsence[]> {
  const map = new Map<string, CalendarAbsence[]>();
  for (const row of absences) {
    const list = map.get(row.absence_date) ?? [];
    list.push(row);
    map.set(row.absence_date, list);
  }
  return map;
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}
