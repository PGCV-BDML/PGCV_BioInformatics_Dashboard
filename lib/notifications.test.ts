import { describe, expect, it } from "vitest";
import {
  getNotificationKind,
  isIncidentAssignedNotification,
  NOTIFICATION_APPROVED,
  NOTIFICATION_INCIDENT_ASSIGNED,
  NOTIFICATION_READY_FOR_REVIEW,
  type AppNotification,
} from "./notifications";

function notification(type: string): AppNotification {
  return {
    id: "n-1",
    type,
    payload: {},
    target_user_id: "user-1",
    is_read: false,
    email_sent_at: null,
    created_at: "2026-08-26T08:12:00.000Z",
  };
}

describe("getNotificationKind", () => {
  it("maps incident assignment separately from analysis review", () => {
    expect(getNotificationKind(notification(NOTIFICATION_INCIDENT_ASSIGNED))).toBe(
      "incident_assigned",
    );
    expect(getNotificationKind(notification(NOTIFICATION_READY_FOR_REVIEW))).toBe(
      "review_request",
    );
    expect(getNotificationKind(notification(NOTIFICATION_APPROVED))).toBe(
      "approval_complete",
    );
  });

  it("does not treat incident notifications as review requests", () => {
    const assigned = notification(NOTIFICATION_INCIDENT_ASSIGNED);
    expect(isIncidentAssignedNotification(assigned)).toBe(true);
    expect(getNotificationKind(assigned)).not.toBe("review_request");
  });
});
