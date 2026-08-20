import { afterEach, describe, expect, it, vi } from "vitest";
import { toDateKey } from "./calendar-tasks";
import {
  calendarsToFetch,
  clearGoogleCalendarToken,
  formatGoogleEventTime,
  googleCalendarErrorMessage,
  googleEventsByDateKey,
  GoogleCalendarAuthError,
  GoogleCalendarError,
  isPersonalOverlayCalendar,
  mapGoogleEvent,
  persistGoogleCalendarToken,
  readGoogleCalendarToken,
  resolveGoogleAccessToken,
  fetchGoogleCalendarEvents,
} from "./google-calendar";

afterEach(() => {
  clearGoogleCalendarToken();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mapGoogleEvent", () => {
  it("maps an all-day event with an exclusive Google end date", () => {
    const mapped = mapGoogleEvent(
      {
        id: "e1",
        summary: "Lab retreat",
        start: { date: "2026-08-20" },
        end: { date: "2026-08-22" },
      },
      "primary",
      "Micah",
    );
    expect(mapped).toMatchObject({
      id: "primary:e1",
      title: "Lab retreat",
      allDay: true,
      start_date: "2026-08-20",
      end_date: "2026-08-21",
      start_time: null,
    });
  });

  it("maps a timed event onto the local start day", () => {
    const start = new Date(2026, 7, 20, 9, 30, 0);
    const end = new Date(2026, 7, 20, 10, 0, 0);
    const mapped = mapGoogleEvent(
      {
        id: "e2",
        summary: "Standup",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
      "primary",
      "Micah",
    );
    expect(mapped).toMatchObject({
      title: "Standup",
      allDay: false,
      start_date: toDateKey(start),
      end_date: toDateKey(end),
      start_time: "09:30",
    });
  });

  it("treats a local midnight exclusive end as the previous day", () => {
    const start = new Date(2026, 7, 20, 22, 0, 0);
    const end = new Date(2026, 7, 21, 0, 0, 0);
    const mapped = mapGoogleEvent(
      {
        id: "e3",
        summary: "Overnight run",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
      "primary",
      "Micah",
    );
    expect(mapped).toMatchObject({
      start_date: toDateKey(start),
      end_date: toDateKey(start),
    });
  });

  it("skips cancelled and declined events", () => {
    expect(
      mapGoogleEvent(
        { id: "c", status: "cancelled", start: { date: "2026-08-20" } },
        "primary",
        "Micah",
      ),
    ).toBeNull();
    expect(
      mapGoogleEvent(
        {
          id: "d",
          summary: "Skip me",
          start: { dateTime: "2026-08-20T09:00:00+08:00" },
          attendees: [{ self: true, responseStatus: "declined" }],
        },
        "primary",
        "Micah",
      ),
    ).toBeNull();
  });

  it("uses a fallback title when Google omits summary", () => {
    expect(
      mapGoogleEvent(
        { id: "n", start: { date: "2026-08-20" }, end: { date: "2026-08-21" } },
        "primary",
        "Micah",
      )?.title,
    ).toBe("(No title)");
  });
});

describe("googleEventsByDateKey", () => {
  it("expands multi-day events and sorts all-day first", () => {
    const byDate = googleEventsByDateKey([
      {
        id: "a",
        calendarId: "primary",
        calendarName: "Micah",
        title: "Later",
        allDay: false,
        start_date: "2026-08-20",
        end_date: "2026-08-20",
        start_time: "15:00",
        htmlLink: null,
        location: null,
      },
      {
        id: "b",
        calendarId: "primary",
        calendarName: "Micah",
        title: "Retreat",
        allDay: true,
        start_date: "2026-08-20",
        end_date: "2026-08-21",
        start_time: null,
        htmlLink: null,
        location: null,
      },
    ]);
    expect(byDate.get("2026-08-20")?.map((e) => e.id)).toEqual(["b", "a"]);
    expect(byDate.get("2026-08-21")?.map((e) => e.id)).toEqual(["b"]);
  });
});

describe("calendarsToFetch", () => {
  it("keeps selected personal calendars and skips holiday calendars", () => {
    expect(
      isPersonalOverlayCalendar(
        "en.philippines#holiday@group.v.calendar.google.com",
      ),
    ).toBe(false);

    const chosen = calendarsToFetch([
      {
        id: "en.philippines#holiday@group.v.calendar.google.com",
        selected: true,
        summary: "Holidays",
      },
      { id: "primary", selected: true, primary: true, summary: "Micah" },
      { id: "hidden-cal", hidden: true, selected: true },
      { id: "other", selected: false, summary: "Unused" },
    ]);
    expect(chosen.map((c) => c.id)).toEqual(["primary"]);
  });

  it("falls back to the primary calendar when none are marked selected", () => {
    const chosen = calendarsToFetch([
      { id: "work", selected: false, summary: "Work" },
      { id: "primary", selected: false, primary: true, summary: "Micah" },
    ]);
    expect(chosen.map((c) => c.id)).toEqual(["primary"]);
  });
});

describe("formatGoogleEventTime", () => {
  it("hides the time chip for a single all-day event", () => {
    expect(
      formatGoogleEventTime({
        id: "a",
        calendarId: "primary",
        calendarName: "Micah",
        title: "Leave",
        allDay: true,
        start_date: "2026-08-20",
        end_date: "2026-08-20",
        start_time: null,
        htmlLink: null,
        location: null,
      }),
    ).toBeNull();
  });
});

describe("token storage", () => {
  it("stores a token only for the matching user", () => {
    persistGoogleCalendarToken("user-1", "tok-1");
    expect(readGoogleCalendarToken("user-1")).toBe("tok-1");
    expect(readGoogleCalendarToken("user-2")).toBeNull();
    expect(resolveGoogleAccessToken("user-1", "fresh")).toBe("tok-1");
    expect(resolveGoogleAccessToken("user-2", "fresh")).toBe("fresh");
    clearGoogleCalendarToken();
    expect(readGoogleCalendarToken("user-1")).toBeNull();
  });
});

describe("googleCalendarErrorMessage", () => {
  it("explains missing permission vs a disabled API", () => {
    expect(googleCalendarErrorMessage(new GoogleCalendarAuthError())).toMatch(
      /Connect your Google Calendar/,
    );
    expect(
      googleCalendarErrorMessage(
        new GoogleCalendarError(
          "Google Calendar API has not been used in project 123 before or it is disabled.",
          403,
        ),
      ),
    ).toMatch(/Google Calendar API is not enabled/);
  });
});

describe("fetchGoogleCalendarEvents", () => {
  it("loads selected calendars and maps events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const href = String(url);
        if (href.includes("calendarList")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "primary",
                  selected: true,
                  primary: true,
                  summary: "Micah",
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "e1",
                summary: "Standup",
                start: { date: "2026-08-20" },
                end: { date: "2026-08-21" },
              },
            ],
          }),
        };
      }),
    );

    const events = await fetchGoogleCalendarEvents("tok", {
      timeMin: new Date("2026-08-01T00:00:00Z"),
      timeMax: new Date("2026-08-31T00:00:00Z"),
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Standup",
      calendarName: "Micah",
      start_date: "2026-08-20",
      end_date: "2026-08-20",
    });
  });

  it("treats insufficient scopes as an auth error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            message: "Request had insufficient authentication scopes.",
          },
        }),
      })),
    );

    await expect(
      fetchGoogleCalendarEvents("tok", {
        timeMin: new Date(),
        timeMax: new Date(),
      }),
    ).rejects.toBeInstanceOf(GoogleCalendarAuthError);
  });
});
