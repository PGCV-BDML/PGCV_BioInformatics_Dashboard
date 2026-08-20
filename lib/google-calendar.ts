import { supabase } from "@/lib/supabase";
import { eachDateKeyInRange, parseLocalDate, toDateKey } from "@/lib/calendar-tasks";

export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

/** Identity scopes plus calendar read — used when connecting overlay access. */
export const GOOGLE_CALENDAR_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  GOOGLE_CALENDAR_READONLY_SCOPE,
].join(" ");

const TOKEN_STORAGE_KEY = "pgcv.googleCalendar.accessToken";
const RECONNECT_FLAG_KEY = "pgcv.googleCalendar.reconnect";

export const GOOGLE_CALENDAR_STYLE = {
  dot: "bg-indigo-500",
  chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
  card: "bg-indigo-50/50 border-indigo-100",
} as const;

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  allDay: boolean;
  start_date: string;
  end_date: string;
  start_time: string | null;
  htmlLink: string | null;
  location: string | null;
};

export class GoogleCalendarAuthError extends Error {
  constructor(message = "Google Calendar access expired or was not granted.") {
    super(message);
    this.name = "GoogleCalendarAuthError";
  }
}

export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GoogleCalendarError";
  }
}

type StoredGoogleToken = {
  userId: string;
  accessToken: string;
};

type GoogleDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleEventRaw = {
  id?: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  location?: string;
  start?: GoogleDate;
  end?: GoogleDate;
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
};

export type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  selected?: boolean;
  primary?: boolean;
  hidden?: boolean;
};

function addDaysToKey(key: string, days: number): string {
  const d = parseLocalDate(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function formatLocalHhMm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function declinedBySelf(event: GoogleEventRaw): boolean {
  const self = event.attendees?.find((a) => a.self);
  return self?.responseStatus === "declined";
}

/** Skip Google's bundled holiday / contacts calendars — the lab calendar already has PH holidays. */
export function isPersonalOverlayCalendar(calendarId: string): boolean {
  const id = calendarId.toLowerCase();
  return (
    !id.includes("holiday@group.v.calendar.google.com") &&
    !id.includes("contacts@group.v.calendar.google.com") &&
    !id.includes("weeknum@group.v.calendar.google.com")
  );
}

export function persistGoogleCalendarToken(userId: string, accessToken: string) {
  if (typeof window === "undefined") return;
  const payload: StoredGoogleToken = { userId, accessToken };
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
}

export function readGoogleCalendarToken(userId: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredGoogleToken;
    if (parsed.userId !== userId || !parsed.accessToken) return null;
    return parsed.accessToken;
  } catch {
    return null;
  }
}

export function clearGoogleCalendarToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function resolveGoogleAccessToken(
  userId: string,
  providerToken?: string | null,
): string | null {
  return readGoogleCalendarToken(userId) ?? (providerToken?.trim() || null);
}

export function markGoogleCalendarReconnectAttempt() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RECONNECT_FLAG_KEY, "1");
}

export function hasGoogleCalendarReconnectAttempt(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(RECONNECT_FLAG_KEY) === "1";
}

export function clearGoogleCalendarReconnectAttempt() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(RECONNECT_FLAG_KEY);
}

export function mapGoogleEvent(
  event: GoogleEventRaw,
  calendarId: string,
  calendarName: string,
): GoogleCalendarEvent | null {
  if (!event.id || event.status === "cancelled") return null;
  if (declinedBySelf(event)) return null;
  if (!event.start) return null;

  const allDay = Boolean(event.start.date);
  let start_date: string;
  let end_date: string;
  let start_time: string | null = null;

  if (allDay) {
    start_date = event.start.date!;
    const exclusiveEnd = event.end?.date ?? addDaysToKey(start_date, 1);
    const inclusiveEnd = addDaysToKey(exclusiveEnd, -1);
    end_date = inclusiveEnd < start_date ? start_date : inclusiveEnd;
  } else {
    if (!event.start.dateTime) return null;
    const startDt = new Date(event.start.dateTime);
    if (Number.isNaN(startDt.getTime())) return null;
    const endDt = event.end?.dateTime ? new Date(event.end.dateTime) : startDt;
    const endLocal =
      endDt && !Number.isNaN(endDt.getTime()) ? endDt : startDt;

    start_date = toDateKey(startDt);
    let endKey = toDateKey(endLocal);
    if (
      endLocal.getHours() === 0 &&
      endLocal.getMinutes() === 0 &&
      endLocal.getSeconds() === 0 &&
      endKey !== start_date
    ) {
      endKey = addDaysToKey(endKey, -1);
    }
    end_date = endKey < start_date ? start_date : endKey;
    start_time = formatLocalHhMm(startDt);
  }

  return {
    id: `${calendarId}:${event.id}`,
    calendarId,
    calendarName,
    title: event.summary?.trim() || "(No title)",
    allDay,
    start_date,
    end_date,
    start_time,
    htmlLink: event.htmlLink ?? null,
    location: event.location?.trim() || null,
  };
}

export function googleEventsByDateKey(
  events: GoogleCalendarEvent[],
): Map<string, GoogleCalendarEvent[]> {
  const map = new Map<string, GoogleCalendarEvent[]>();
  for (const event of events) {
    for (const key of eachDateKeyInRange(event.start_date, event.end_date)) {
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.start_time !== b.start_time) {
        if (!a.start_time) return -1;
        if (!b.start_time) return 1;
        return a.start_time.localeCompare(b.start_time);
      }
      return a.title.localeCompare(b.title);
    });
  }
  return map;
}

export function calendarsToFetch(
  list: GoogleCalendarListEntry[],
): GoogleCalendarListEntry[] {
  const overlay = list.filter(
    (c) => c.id && !c.hidden && isPersonalOverlayCalendar(c.id),
  );
  const selected = overlay.filter((c) => c.selected !== false);
  const pool = selected.length > 0 ? selected : overlay.filter((c) => c.primary);
  const fallback = pool.length > 0 ? pool : overlay;
  return fallback.slice(0, 8);
}

export function formatGoogleEventTime(event: GoogleCalendarEvent): string | null {
  if (event.allDay) {
    return event.start_date === event.end_date ? null : "All day";
  }
  return event.start_time;
}

async function googleFetch<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new GoogleCalendarAuthError();
  }

  if (!res.ok) {
    let detail = `Google Calendar request failed (${res.status})`;
    let reason = "";
    try {
      const body = (await res.json()) as {
        error?: {
          message?: string;
          status?: string;
          errors?: Array<{ reason?: string }>;
        };
      };
      const message = body?.error?.message;
      reason = body?.error?.errors?.[0]?.reason ?? "";
      if (typeof message === "string" && message) detail = message;
    } catch {
      // body was not JSON
    }

    const insufficientScope =
      /insufficient.*(scope|permission)|authentication scopes/i.test(detail) ||
      reason === "insufficientPermissions";
    if (res.status === 403 && insufficientScope) {
      throw new GoogleCalendarAuthError(detail);
    }

    throw new GoogleCalendarError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

function toRfc3339(date: Date): string {
  return date.toISOString();
}

async function fetchCalendarEventsPage(
  accessToken: string,
  calendarId: string,
  calendarName: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page += 1) {
    const params = new URLSearchParams({
      timeMin: toRfc3339(timeMin),
      timeMax: toRfc3339(timeMax),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const encodedId = encodeURIComponent(calendarId);
    const body = await googleFetch<{
      items?: GoogleEventRaw[];
      nextPageToken?: string;
    }>(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params}`,
    );

    for (const item of body.items ?? []) {
      const mapped = mapGoogleEvent(item, calendarId, calendarName);
      if (mapped) events.push(mapped);
    }

    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  range: { timeMin: Date; timeMax: Date },
): Promise<GoogleCalendarEvent[]> {
  const list = await googleFetch<{ items?: GoogleCalendarListEntry[] }>(
    accessToken,
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
  );

  const calendars = calendarsToFetch(list.items ?? []);
  const batches = await Promise.all(
    calendars.map((calendar) =>
      fetchCalendarEventsPage(
        accessToken,
        calendar.id!,
        calendar.summary?.trim() || "Google Calendar",
        range.timeMin,
        range.timeMax,
      ),
    ),
  );

  return batches.flat();
}

export function googleCalendarErrorMessage(error: unknown): string {
  if (error instanceof GoogleCalendarAuthError) {
    return "Connect your Google Calendar to show your personal events here. Only you can see them.";
  }
  if (error instanceof GoogleCalendarError) {
    if (/has not been used|access not configured|disabled/i.test(error.message)) {
      return "Google Calendar API is not enabled for this app yet. Ask a team lead to enable it in Google Cloud Console.";
    }
    return error.message;
  }
  return "Couldn't load your Google Calendar.";
}

export async function connectGoogleCalendar(
  redirectPath = "/dashboard/calendar",
): Promise<void> {
  const redirectTo = `${window.location.origin}${redirectPath}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: GOOGLE_CALENDAR_OAUTH_SCOPES,
      queryParams: {
        access_type: "offline",
        include_granted_scopes: "true",
      },
    },
  });
  if (error) throw error;
}
