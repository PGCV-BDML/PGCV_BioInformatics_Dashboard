import { describe, expect, it } from "vitest";
import type { UserAbsence } from "@/types/database";
import {
  absencesByDateKey,
  filterAbsencesByStatus,
  mapAbsencesForCalendar,
  maxAbsenceDate,
  normalizeAbsenceDates,
} from "./calendar-absences";

describe("normalizeAbsenceDates", () => {
  it("dedupes and sorts dates", () => {
    expect(normalizeAbsenceDates(["2026-08-12", "2026-08-05", "2026-08-12", ""]))
      .toEqual(["2026-08-05", "2026-08-12"]);
  });
});

describe("maxAbsenceDate", () => {
  it("returns the latest date", () => {
    expect(maxAbsenceDate(["2026-08-05", "2026-08-12"])).toBe("2026-08-12");
  });

  it("returns null when empty", () => {
    expect(maxAbsenceDate([])).toBeNull();
  });
});

describe("mapAbsencesForCalendar", () => {
  it("resolves user names", () => {
    const rows: UserAbsence[] = [
      {
        id: "a1",
        user_id: "u1",
        absence_date: "2026-08-05",
        status: "on_leave",
        note: null,
        created_by: null,
      },
    ];
    const mapped = mapAbsencesForCalendar(
      rows,
      new Map([["u1", "Alex Rivera"]]),
    );
    expect(mapped[0]?.user_name).toBe("Alex Rivera");
  });

  it("drops absences for users outside the team directory", () => {
    const rows: UserAbsence[] = [
      {
        id: "a1",
        user_id: "u1",
        absence_date: "2026-08-05",
        status: "on_leave",
        note: null,
        created_by: null,
      },
      {
        id: "a2",
        user_id: "u2",
        absence_date: "2026-08-06",
        status: "on_travel",
        note: null,
        created_by: null,
      },
    ];
    const mapped = mapAbsencesForCalendar(rows, new Map([["u1", "Alex Rivera"]]));
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.user_id).toBe("u1");
  });
});

describe("filterAbsencesByStatus", () => {
  it("filters by status", () => {
    const rows = mapAbsencesForCalendar(
      [
        {
          id: "1",
          user_id: "u1",
          absence_date: "2026-08-05",
          status: "on_leave",
          note: null,
          created_by: null,
        },
        {
          id: "2",
          user_id: "u2",
          absence_date: "2026-08-06",
          status: "on_travel",
          note: null,
          created_by: null,
        },
      ],
      new Map([
        ["u1", "A"],
        ["u2", "B"],
      ]),
    );
    expect(filterAbsencesByStatus(rows, "on_leave")).toHaveLength(1);
  });
});

describe("absencesByDateKey", () => {
  it("groups by date", () => {
    const rows = mapAbsencesForCalendar(
      [
        {
          id: "1",
          user_id: "u1",
          absence_date: "2026-08-05",
          status: "on_leave",
          note: null,
          created_by: null,
        },
        {
          id: "2",
          user_id: "u2",
          absence_date: "2026-08-05",
          status: "on_leave",
          note: null,
          created_by: null,
        },
      ],
      new Map([
        ["u1", "A"],
        ["u2", "B"],
      ]),
    );
    const grouped = absencesByDateKey(rows);
    expect(grouped.get("2026-08-05")).toHaveLength(2);
  });
});
