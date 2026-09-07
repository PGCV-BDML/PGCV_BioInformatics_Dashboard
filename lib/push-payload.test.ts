import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_APPROVED,
  NOTIFICATION_INCIDENT_ASSIGNED,
  NOTIFICATION_READY_FOR_REVIEW,
  NOTIFICATION_REVISION_REQUESTED,
  NOTIFICATION_TASK_COMING_UP,
  NOTIFICATION_TASK_PAST_DUE,
} from "./notifications";
import { buildWebPushPayload } from "./push-payload";
import { getPushSetupState, isIosUserAgent } from "./push-support";

describe("buildWebPushPayload", () => {
  it("routes analysis alerts to the notifications inbox", () => {
    const payload = buildWebPushPayload({
      id: "n-1",
      type: NOTIFICATION_READY_FOR_REVIEW,
      payload: {
        client_name: "UP Visayas",
        service_report_number: "SR-12",
      },
    });
    expect(payload.title).toBe("Report ready for review");
    expect(payload.body).toContain("SR-12");
    expect(payload.path).toBe("/dashboard/notifications");
    expect(payload.tag).toBe("n-1");
  });

  it("includes a revision comment in the body", () => {
    const payload = buildWebPushPayload({
      id: "n-2",
      type: NOTIFICATION_REVISION_REQUESTED,
      payload: {
        client_name: "Client",
        comment: "Please fix figure 2.",
      },
    });
    expect(payload.title).toBe("Revision requested");
    expect(payload.body).toContain("Please fix figure 2.");
  });

  it("deep-links incident assignments", () => {
    const payload = buildWebPushPayload({
      id: "n-3",
      type: NOTIFICATION_INCIDENT_ASSIGNED,
      payload: {
        incident_id: "inc-9",
        title: "Freezer alarm",
        severity: "high",
      },
    });
    expect(payload.path).toBe("/dashboard/incidents?id=inc-9");
    expect(payload.body).toContain("Freezer alarm");
  });

  it("asks if a past-due task is already completed", () => {
    const payload = buildWebPushPayload({
      id: "n-7",
      type: NOTIFICATION_TASK_PAST_DUE,
      payload: {
        task_id: "task-2",
        title: "Finish primer set",
        due_date: "2020-01-01",
      },
    });
    expect(payload.title).toBe("Past due: Finish primer set");
    expect(payload.body).toContain("Is this task completed already?");
    expect(payload.path).toContain("task=task-2");
  });

  it("deep-links upcoming task reminders", () => {
    const payload = buildWebPushPayload({
      id: "n-6",
      type: NOTIFICATION_TASK_COMING_UP,
      payload: {
        task_id: "task-1",
        title: "Campus tour",
        start_date: "2099-01-02",
        when: "tomorrow",
        categories: ["tour"],
        task_time: "09:00:00",
      },
    });
    expect(payload.title).toContain("Campus tour");
    expect(payload.body).toContain("Tour");
    expect(payload.path).toContain("task=task-1");
  });

  it("falls back for unknown types", () => {
    const payload = buildWebPushPayload({
      id: "n-4",
      type: "something_else",
      payload: {},
    });
    expect(payload.title).toBe("PGCV Dashboard");
    expect(payload.path).toBe("/dashboard/notifications");
  });

  it("keeps approved reports on the inbox path", () => {
    expect(
      buildWebPushPayload({
        id: "n-5",
        type: NOTIFICATION_APPROVED,
        payload: { service_report_number: "SR-1" },
      }).title,
    ).toBe("Report approved");
  });
});

describe("getPushSetupState", () => {
  const capable = {
    configured: true,
    notificationSupported: true,
    pushManagerSupported: true,
    serviceWorkerSupported: true,
    permission: "default" as const,
    subscribed: false,
  };

  it("requires the Home Screen app on iOS", () => {
    expect(
      getPushSetupState({
        ...capable,
        isIos: true,
        isStandalone: false,
      }),
    ).toBe("ios_install");
  });

  it("prompts inside the installed iOS app", () => {
    expect(
      getPushSetupState({
        ...capable,
        isIos: true,
        isStandalone: true,
      }),
    ).toBe("prompt");
  });

  it("lets Android enable alerts without installing", () => {
    expect(
      getPushSetupState({
        ...capable,
        isIos: false,
        isStandalone: false,
      }),
    ).toBe("prompt");
  });

  it("treats a granted subscription as on", () => {
    expect(
      getPushSetupState({
        ...capable,
        isIos: false,
        isStandalone: false,
        permission: "granted",
        subscribed: true,
      }),
    ).toBe("subscribed");
  });

  it("surfaces blocked permission and missing config", () => {
    expect(
      getPushSetupState({
        ...capable,
        isIos: false,
        isStandalone: false,
        permission: "denied",
      }),
    ).toBe("denied");
    expect(
      getPushSetupState({
        ...capable,
        configured: false,
        isIos: false,
        isStandalone: false,
      }),
    ).toBe("not_configured");
  });
});

describe("isIosUserAgent", () => {
  it("detects iPhone and iPadOS-as-Mac", () => {
    expect(isIosUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      true,
    );
    expect(isIosUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5)).toBe(
      true,
    );
    expect(isIosUserAgent("Mozilla/5.0 (Linux; Android 14)", 5)).toBe(false);
  });
});
