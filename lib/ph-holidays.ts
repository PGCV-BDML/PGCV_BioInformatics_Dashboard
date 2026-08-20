import { toDateKey } from "@/lib/calendar-tasks";

export type PhilippineHoliday = {
  date: string;
  name: string;
  localName: string | null;
};

const NAGER_URL = "https://date.nager.at/api/v3/PublicHolidays";
const NAGER_TIMEOUT_MS = 8000;

/** Chinese New Year dates used when the public-holiday feed is unavailable. */
const CHINESE_NEW_YEAR: Record<number, string> = {
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-03",
  2031: "2031-01-23",
  2032: "2032-02-11",
  2033: "2033-01-31",
  2034: "2034-02-19",
  2035: "2035-02-08",
};

type NagerHoliday = {
  date?: string;
  name?: string;
  localName?: string;
  types?: string[];
};

function dateKey(year: number, month: number, day: number): string {
  return toDateKey(new Date(year, month - 1, day));
}

function holiday(
  date: string,
  name: string,
  localName: string | null = null,
): PhilippineHoliday {
  return { date, name, localName };
}

/** Anonymous Gregorian (Meeus/Jones/Butcher) Easter Sunday. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Last Monday of August (National Heroes Day). */
export function nationalHeroesDay(year: number): Date {
  const last = new Date(year, 8, 0);
  const weekday = last.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  last.setDate(last.getDate() - offset);
  return last;
}

/**
 * Regular and commonly proclaimed nationwide holidays, computed locally
 * so the calendar still works without a network call.
 */
export function getRegularPhilippineHolidays(year: number): PhilippineHoliday[] {
  const easter = easterSunday(year);
  const list: PhilippineHoliday[] = [
    holiday(dateKey(year, 1, 1), "New Year's Day", "Bagong Taon"),
    holiday(toDateKey(addDays(easter, -3)), "Maundy Thursday", "Huwebes Santo"),
    holiday(toDateKey(addDays(easter, -2)), "Good Friday", "Biyernes Santo"),
    holiday(toDateKey(addDays(easter, -1)), "Black Saturday", "Sabado de Gloria"),
    holiday(dateKey(year, 4, 9), "Day of Valor", "Araw ng Kagitingan"),
    holiday(dateKey(year, 5, 1), "Labor Day", "Araw ng Paggawa"),
    holiday(dateKey(year, 6, 12), "Independence Day", "Araw ng Kalayaan"),
    holiday(dateKey(year, 8, 21), "Ninoy Aquino Day", "Araw ni Ninoy Aquino"),
    holiday(
      toDateKey(nationalHeroesDay(year)),
      "National Heroes Day",
      "Araw ng mga Bayani",
    ),
    holiday(dateKey(year, 11, 1), "All Saints' Day", "Araw ng mga Santo"),
    holiday(dateKey(year, 11, 2), "All Souls' Day", "Araw ng mga Kaluluwa"),
    holiday(dateKey(year, 11, 30), "Bonifacio Day", "Araw ni Bonifacio"),
    holiday(
      dateKey(year, 12, 8),
      "Feast of the Immaculate Conception",
      "Immaculada Concepcion",
    ),
    holiday(dateKey(year, 12, 24), "Christmas Eve", "Bisperas ng Pasko"),
    holiday(dateKey(year, 12, 25), "Christmas Day", "Araw ng Pasko"),
    holiday(dateKey(year, 12, 30), "Rizal Day", "Araw ni Rizal"),
    holiday(dateKey(year, 12, 31), "Last Day of the Year", "Huling Araw ng Taon"),
  ];

  const cny = CHINESE_NEW_YEAR[year];
  if (cny) {
    list.push(holiday(cny, "Chinese New Year", "Chinese New Year"));
  }

  return mergeHolidays(list);
}

export function mergeHolidays(
  ...groups: PhilippineHoliday[][]
): PhilippineHoliday[] {
  const byDate = new Map<string, PhilippineHoliday>();
  for (const group of groups) {
    for (const row of group) {
      const date = row.date.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const existing = byDate.get(date);
      if (!existing) {
        byDate.set(date, {
          date,
          name: row.name.trim() || "Holiday",
          localName: row.localName?.trim() || null,
        });
        continue;
      }
      if (!existing.localName && row.localName?.trim()) {
        existing.localName = row.localName.trim();
      }
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function holidaysByDateKey(
  holidays: PhilippineHoliday[],
): Map<string, PhilippineHoliday[]> {
  const map = new Map<string, PhilippineHoliday[]>();
  for (const row of holidays) {
    const list = map.get(row.date) ?? [];
    list.push(row);
    map.set(row.date, list);
  }
  return map;
}

function mapNagerHolidays(rows: NagerHoliday[]): PhilippineHoliday[] {
  return rows.flatMap((row) => {
    const date = String(row.date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const types = row.types ?? ["Public"];
    if (types.length > 0 && !types.includes("Public")) return [];
    return [
      holiday(
        date,
        String(row.name ?? "").trim() || "Holiday",
        String(row.localName ?? "").trim() || null,
      ),
    ];
  });
}

async function fetchNagerHolidays(year: number): Promise<PhilippineHoliday[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAGER_TIMEOUT_MS);
  try {
    const response = await fetch(`${NAGER_URL}/${year}/PH`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Holiday feed ${response.status}`);
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) return [];
    return mapNagerHolidays(payload as NagerHoliday[]);
  } finally {
    clearTimeout(timer);
  }
}

const holidayCache = new Map<number, PhilippineHoliday[]>();

export function clearPhilippineHolidayCache(): void {
  holidayCache.clear();
}

/**
 * Nationwide PH holidays for a year. Starts from the local statutory set,
 * then merges Nager.Date so Eid and newly proclaimed days appear when online.
 */
export async function loadPhilippineHolidays(
  year: number,
): Promise<PhilippineHoliday[]> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const local = getRegularPhilippineHolidays(year);
  try {
    const remote = await fetchNagerHolidays(year);
    const merged = mergeHolidays(local, remote);
    holidayCache.set(year, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function loadPhilippineHolidaysForYears(
  years: number[],
): Promise<PhilippineHoliday[]> {
  const uniqueYears = Array.from(new Set(years));
  const groups = await Promise.all(
    uniqueYears.map((year) => loadPhilippineHolidays(year)),
  );
  return mergeHolidays(...groups);
}

export function yearsAroundMonth(viewMonth: Date): number[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  if (month === 0) return [year - 1, year];
  if (month === 11) return [year, year + 1];
  return [year];
}
