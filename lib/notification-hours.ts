/** Lock-screen and reminder pings use Philippine working hours. */
export const NOTIFICATION_TIME_ZONE = "Asia/Manila";

/** Inclusive local hour when alerts may go out (6:00 AM). */
export const NOTIFICATION_HOURS_START = 6;

/** Exclusive local hour when alerts stop (6:00 PM). */
export const NOTIFICATION_HOURS_END = 18;

export function manilaHour(now: Date = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: NOTIFICATION_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart);
  return Number.isFinite(hour) ? hour : 0;
}

export function isNotificationHours(now: Date = new Date()): boolean {
  const hour = manilaHour(now);
  return hour >= NOTIFICATION_HOURS_START && hour < NOTIFICATION_HOURS_END;
}
