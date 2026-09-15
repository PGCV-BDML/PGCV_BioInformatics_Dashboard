import { describe, expect, it } from "vitest";
import { isNotificationHours, manilaHour } from "./notification-hours";

describe("notification working hours (Asia/Manila)", () => {
  it("treats 6:00 AM as in hours and 5:59 AM as quiet", () => {
    const sixAm = new Date("2026-09-14T22:00:00.000Z");
    const justBefore = new Date("2026-09-14T21:59:00.000Z");
    expect(manilaHour(sixAm)).toBe(6);
    expect(isNotificationHours(sixAm)).toBe(true);
    expect(manilaHour(justBefore)).toBe(5);
    expect(isNotificationHours(justBefore)).toBe(false);
  });

  it("treats 5:59 PM as in hours and 6:00 PM as quiet", () => {
    const justBeforeSixPm = new Date("2026-09-15T09:59:00.000Z");
    const sixPm = new Date("2026-09-15T10:00:00.000Z");
    expect(manilaHour(justBeforeSixPm)).toBe(17);
    expect(isNotificationHours(justBeforeSixPm)).toBe(true);
    expect(manilaHour(sixPm)).toBe(18);
    expect(isNotificationHours(sixPm)).toBe(false);
  });

  it("does not ping at the old midnight cron slot", () => {
    const midnightish = new Date("2026-09-14T16:05:00.000Z");
    expect(manilaHour(midnightish)).toBe(0);
    expect(isNotificationHours(midnightish)).toBe(false);
  });
});
