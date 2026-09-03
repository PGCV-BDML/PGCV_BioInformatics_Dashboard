import {
  NOTIFICATION_APPROVED,
  NOTIFICATION_CHANGES_REQUESTED,
  NOTIFICATION_INCIDENT_ASSIGNED,
  NOTIFICATION_READY_FOR_APPROVAL,
  NOTIFICATION_READY_FOR_REVIEW,
  NOTIFICATION_REVISION_REQUESTED,
} from "@/lib/notifications";

export type PushNotificationInput = {
  id: string;
  type: string;
  payload: {
    analysis_id?: string;
    client_name?: string | null;
    service_report_number?: string | null;
    comment?: string | null;
    incident_id?: string;
    title?: string | null;
    severity?: string | null;
  };
};

export type WebPushPayload = {
  title: string;
  body: string;
  path: string;
  tag: string;
};

function reportLabel(payload: PushNotificationInput["payload"]): string {
  const number = payload.service_report_number?.trim();
  const client = payload.client_name?.trim();
  if (number && client) return `${number} · ${client}`;
  return number || client || "a service report";
}

function clip(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/** Copy + deep-link for a Web Push banner from an in-app notification row. */
export function buildWebPushPayload(
  notification: PushNotificationInput,
): WebPushPayload {
  const tag = notification.id;
  const report = reportLabel(notification.payload);

  switch (notification.type) {
    case NOTIFICATION_READY_FOR_REVIEW:
      return {
        title: "Report ready for review",
        body: clip(report),
        path: "/dashboard/notifications",
        tag,
      };
    case NOTIFICATION_REVISION_REQUESTED:
      return {
        title: "Revision requested",
        body: clip(
          notification.payload.comment?.trim()
            ? `${report}: ${notification.payload.comment}`
            : report,
        ),
        path: "/dashboard/notifications",
        tag,
      };
    case NOTIFICATION_READY_FOR_APPROVAL:
      return {
        title: "Report ready for approval",
        body: clip(report),
        path: "/dashboard/notifications",
        tag,
      };
    case NOTIFICATION_CHANGES_REQUESTED:
      return {
        title: "Changes requested",
        body: clip(
          notification.payload.comment?.trim()
            ? `${report}: ${notification.payload.comment}`
            : report,
        ),
        path: "/dashboard/notifications",
        tag,
      };
    case NOTIFICATION_APPROVED:
      return {
        title: "Report approved",
        body: clip(report),
        path: "/dashboard/notifications",
        tag,
      };
    case NOTIFICATION_INCIDENT_ASSIGNED: {
      const incidentTitle = notification.payload.title?.trim() || "Incident assigned to you";
      const severity = notification.payload.severity?.trim();
      const incidentId = notification.payload.incident_id?.trim();
      return {
        title: "Incident assigned to you",
        body: clip(severity ? `${severity}: ${incidentTitle}` : incidentTitle),
        path: incidentId
          ? `/dashboard/incidents?id=${encodeURIComponent(incidentId)}`
          : "/dashboard/incidents",
        tag,
      };
    }
    default:
      return {
        title: "PGCV Dashboard",
        body: "You have a new notification.",
        path: "/dashboard/notifications",
        tag,
      };
  }
}
