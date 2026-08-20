import { describe, expect, it, vi, afterEach } from "vitest";
import {
  easterSunday,
  getRegularPhilippineHolidays,
  holidaysByDateKey,
  loadPhilippineHolidays,
  mergeHolidays,
  nationalHeroesDay,
  clearPhilippineHolidayCache,
  yearsAroundMonth,
} from "./ph-holidays";
import { toDateKey } from "./calendar-tasks";

afterEach(() => {
  clearPhilippineHolidayCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("easterSunday", () => {
  it("matches known Western Easter dates", () => {
    expect(toDateKey(easterSunday(2025))).toBe("2025-04-20");
    expect(toDateKey(easterSunday(2026))).toBe("2026-04-05");
  });
});

describe("nationalHeroesDay", () => {
  it("is the last Monday of August", () => {
    expect(toDateKey(nationalHeroesDay(2026))).toBe("2026-08-31");
    expect(toDateKey(nationalHeroesDay(2025))).toBe("2025-08-25");
  });
});

describe("getRegularPhilippineHolidays", () => {
  it("includes 2026 regular and special nationwide dates", () => {
    const byDate = holidaysByDateKey(getRegularPhilippineHolidays(2026));
    expect(byDate.get("2026-01-01")?.[0]?.name).toBe("New Year's Day");
    expect(byDate.get("2026-02-17")?.[0]?.name).toBe("Chinese New Year");
    expect(byDate.get("2026-04-02")?.[0]?.name).toBe("Maundy Thursday");
    expect(byDate.get("2026-04-03")?.[0]?.name).toBe("Good Friday");
    expect(byDate.get("2026-04-04")?.[0]?.name).toBe("Black Saturday");
    expect(byDate.get("2026-06-12")?.[0]?.name).toBe("Independence Day");
    expect(byDate.get("2026-08-31")?.[0]?.name).toBe("National Heroes Day");
    expect(byDate.get("2026-12-25")?.[0]?.name).toBe("Christmas Day");
  });
});

describe("mergeHolidays", () => {
  it("keeps the first name for a date and fills in a missing local name", () => {
    const merged = mergeHolidays(
      [{ date: "2026-06-12", name: "Independence Day", localName: null }],
      [
        {
          date: "2026-06-12",
          name: "Araw ng Kalayaan",
          localName: "Araw ng Kalayaan",
        },
        { date: "2026-03-20", name: "Eid'l Fitr", localName: "Eid'l Fitr" },
      ],
    );
    expect(merged).toEqual([
      { date: "2026-03-20", name: "Eid'l Fitr", localName: "Eid'l Fitr" },
      {
        date: "2026-06-12",
        name: "Independence Day",
        localName: "Araw ng Kalayaan",
      },
    ]);
  });
});

describe("yearsAroundMonth", () => {
  it("pulls the neighboring year when the grid can spill over", () => {
    expect(yearsAroundMonth(new Date(2026, 0, 1))).toEqual([2025, 2026]);
    expect(yearsAroundMonth(new Date(2026, 7, 1))).toEqual([2026]);
    expect(yearsAroundMonth(new Date(2026, 11, 1))).toEqual([2026, 2027]);
  });
});

describe("loadPhilippineHolidays", () => {
  it("merges Eid from the public feed onto the local set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            date: "2026-03-20",
            name: "Eid'l Fitr",
            localName: "Eid'l Fitr",
            types: ["Public"],
          },
        ],
      })),
    );

    const holidays = await loadPhilippineHolidays(2026);
    const byDate = holidaysByDateKey(holidays);
    expect(byDate.get("2026-03-20")?.[0]?.name).toBe("Eid'l Fitr");
    expect(byDate.get("2026-06-12")?.[0]?.name).toBe("Independence Day");
  });

  it("falls back to the local set when the feed is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    const holidays = await loadPhilippineHolidays(2025);
    expect(holidaysByDateKey(holidays).get("2025-06-12")?.[0]?.name).toBe(
      "Independence Day",
    );
  });
});
