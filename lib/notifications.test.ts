import { describe, expect, it } from "vitest";
import {
  getNotificationKind,
  isIncidentAssignedNotification,
  NOTIFICATION_APPROVED,
  NOTIFICATION_INCIDENT_ASSIGNED,
  NOTIFICATION_READY_FOR_APPROVAL,
  NOTIFICATION_READY_FOR_REVIEW,
  NOTIFICATION_REVISION_REQUESTED,
  overlayLiveAnalysisOnNotifications,
  shouldPreviewSignedLastPage,
  type AppNotification,
} from "./notifications";

function notification(
  type: string,
  extra?: Partial<AppNotification>,
): AppNotification {
  return {
    id: "n-1",
    type,
    payload: {},
    target_user_id: "user-1",
    is_read: false,
    email_sent_at: null,
    created_at: "2026-08-26T08:12:00.000Z",
    ...extra,
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

describe("overlayLiveAnalysisOnNotifications", () => {
  const live = new Map([
    [
      "a-1",
      {
        review: "Reviewed",
        submission: "Approved",
        filePath: "a-1/stamp/report_signed.pdf",
        fileName: "report_signed.pdf",
      },
    ],
  ]);

  it("replaces the stored PDF on review, approval, and approved cards", () => {
    const review = notification(NOTIFICATION_READY_FOR_REVIEW, {
      payload: {
        analysis_id: "a-1",
        service_report_file_path: "a-1/old/report.pdf",
        service_report_file_name: "report.pdf",
      },
    });
    const [next] = overlayLiveAnalysisOnNotifications([review], live);
    expect(next?.payload.service_report_file_path).toBe(
      "a-1/stamp/report_signed.pdf",
    );
    expect(next?.payload.service_report_file_name).toBe("report_signed.pdf");
    expect(next?.review_status).toBe("Reviewed");
    expect(next?.submission_status).toBe("Approved");
  });

  it("leaves the file on revision-request cards", () => {
    const sentBack = notification(NOTIFICATION_REVISION_REQUESTED, {
      payload: {
        analysis_id: "a-1",
        service_report_file_path: "a-1/old/report.pdf",
        service_report_file_name: "report.pdf",
      },
    });
    const [next] = overlayLiveAnalysisOnNotifications([sentBack], live);
    expect(next?.payload.service_report_file_path).toBe("a-1/old/report.pdf");
    expect(next?.review_status).toBe("Reviewed");
  });
});

describe("shouldPreviewSignedLastPage", () => {
  it("opens the last page after the officer has signed", () => {
    expect(
      shouldPreviewSignedLastPage(
        notification(NOTIFICATION_READY_FOR_REVIEW, {
          review_status: "Reviewed",
        }),
      ),
    ).toBe(true);
    expect(
      shouldPreviewSignedLastPage(
        notification(NOTIFICATION_READY_FOR_APPROVAL, {
          submission_status: "Approved",
        }),
      ),
    ).toBe(true);
    expect(
      shouldPreviewSignedLastPage(notification(NOTIFICATION_APPROVED)),
    ).toBe(true);
  });

  it("keeps the full PDF while the report is still being read", () => {
    expect(
      shouldPreviewSignedLastPage(
        notification(NOTIFICATION_READY_FOR_REVIEW, {
          review_status: "In review",
        }),
      ),
    ).toBe(false);
    expect(
      shouldPreviewSignedLastPage(
        notification(NOTIFICATION_READY_FOR_APPROVAL, {
          submission_status: "Under review",
        }),
      ),
    ).toBe(false);
  });
});
