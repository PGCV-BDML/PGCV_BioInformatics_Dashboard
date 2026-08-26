import { formatDate } from "@/lib/utils";
import type {
  IncidentCategory,
  IncidentLocation,
  IncidentReport,
  IncidentReportFormData,
  IncidentSeverity,
  IncidentStatus,
  IncidentStatusEvent,
  UserRole,
} from "@/types/database";
import {
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_LOCATION_OPTIONS,
  INCIDENT_SEVERITY_OPTIONS,
  INCIDENT_STATUS_OPTIONS,
} from "@/types/database";

export function localDateToday(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function emptyIncidentForm(
  now = new Date(),
): IncidentReportFormData {
  return {
    title: "",
    incident_date: localDateToday(now),
    incident_time: "",
    location: "lab",
    location_detail: "",
    category: "sample_data_handling",
    severity: "medium",
    description: "",
    immediate_action: "",
    people_involved: "",
    related_run_id: "",
    follow_up: "",
    point_person_id: "",
    status: "open",
  };
}

/** HTML time inputs want HH:MM; Postgres time often comes back as HH:MM:SS. */
export function formatIncidentTimeForInput(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const match = value.trim().match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? "";
}

/** Persist optional time as HH:MM:SS for the Postgres `time` column. */
export function normalizeIncidentTime(
  value: string | null | undefined,
): string | null {
  const hhmm = formatIncidentTimeForInput(value);
  return hhmm ? `${hhmm}:00` : null;
}

export function formatIncidentWhen(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  const dateLabel = formatDate(date);
  const timeLabel = formatIncidentTimeForInput(time);
  if (!dateLabel && !timeLabel) return "—";
  if (!timeLabel) return dateLabel;
  if (!dateLabel) return timeLabel;
  return `${dateLabel} · ${timeLabel}`;
}

export function formFromIncident(row: IncidentReport): IncidentReportFormData {
  return {
    title: row.title,
    incident_date: row.incident_date,
    incident_time: formatIncidentTimeForInput(row.incident_time),
    location: row.location,
    location_detail: row.location_detail ?? "",
    category: row.category,
    severity: row.severity,
    description: row.description,
    immediate_action: row.immediate_action ?? "",
    people_involved: row.people_involved ?? "",
    related_run_id: row.related_run_id ?? "",
    follow_up: row.follow_up ?? "",
    point_person_id: row.point_person_id ?? "",
    status: row.status,
  };
}

export function buildIncidentReportPayload(
  form: IncidentReportFormData,
): Omit<
  IncidentReport,
  | "id"
  | "reporter_id"
  | "created_at"
  | "updated_at"
  | "resolved_by"
  | "resolved_at"
  | "closed_by"
  | "closed_at"
> {
  return {
    title: form.title.trim(),
    incident_date: form.incident_date,
    incident_time: normalizeIncidentTime(form.incident_time),
    location: form.location,
    location_detail: form.location_detail.trim() || null,
    category: form.category,
    severity: form.severity,
    description: form.description.trim(),
    immediate_action: form.immediate_action.trim() || null,
    people_involved: form.people_involved.trim() || null,
    related_run_id: form.related_run_id.trim() || null,
    follow_up: form.follow_up.trim() || null,
    point_person_id: form.point_person_id.trim() || null,
    status: form.status,
  };
}

/** Status + follow-up only — what a point person who did not file the case may save. */
export function buildIncidentStatusFollowUpPayload(
  form: IncidentReportFormData,
): Pick<IncidentReport, "status" | "follow_up"> {
  return {
    status: form.status,
    follow_up: form.follow_up.trim() || null,
  };
}

export function canManageIncident(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  reporterId: string,
): boolean {
  if (role === "team_lead") return true;
  return role === "team_member" && Boolean(userId) && userId === reporterId;
}

export function canChangeIncidentStatus(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  reporterId: string,
  pointPersonId: string | null | undefined,
): boolean {
  if (canManageIncident(role, userId, reporterId)) return true;
  return (
    (role === "team_lead" || role === "team_member") &&
    Boolean(userId) &&
    userId === pointPersonId
  );
}

export function isClosedIncidentStatus(
  status: IncidentStatus | null | undefined,
): boolean {
  return status === "closed";
}

/**
 * Keep open work first. A newly closed report always goes to the absolute
 * bottom; reopening one places it just above the remaining closed rows.
 */
export function arrangeIncidentsAfterStatusChange<
  T extends { id: string; status: IncidentStatus },
>(rows: T[], id: string, next: T): T[] {
  const others = rows.filter((row) => row.id !== id);
  const active = others.filter((row) => !isClosedIncidentStatus(row.status));
  const closed = others.filter((row) => isClosedIncidentStatus(row.status));

  if (isClosedIncidentStatus(next.status)) {
    return [...active, ...closed, next];
  }
  return [...active, next, ...closed];
}

export function incidentCategoryLabel(value: IncidentCategory): string {
  return (
    INCIDENT_CATEGORY_OPTIONS.find((opt) => opt.value === value)?.label ?? value
  );
}

export function incidentSeverityLabel(value: IncidentSeverity): string {
  return (
    INCIDENT_SEVERITY_OPTIONS.find((opt) => opt.value === value)?.label ?? value
  );
}

export function incidentStatusLabel(value: IncidentStatus): string {
  return (
    INCIDENT_STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? value
  );
}

export function incidentLocationLabel(value: IncidentLocation): string {
  return (
    INCIDENT_LOCATION_OPTIONS.find((opt) => opt.value === value)?.label ?? value
  );
}

export function formatIncidentDateTime(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function incidentStatusEventLabel(
  event: IncidentStatusEvent,
  actorName: string | null | undefined,
): string {
  const name = actorName?.trim() || "Unknown";
  const when = formatIncidentDateTime(event.changed_at) || "an unknown time";
  const toLabel = incidentStatusLabel(event.to_status);

  if (!event.from_status) {
    return `${name} logged this as ${toLabel} on ${when}`;
  }
  if (event.to_status === "resolved") {
    return `${name} marked this resolved on ${when}`;
  }
  if (event.to_status === "closed") {
    return `${name} closed this case on ${when}`;
  }
  const fromLabel = incidentStatusLabel(event.from_status);
  return `${name} changed this from ${fromLabel} to ${toLabel} on ${when}`;
}
