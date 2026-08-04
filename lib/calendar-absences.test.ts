import { describe, expect, it } from "vitest";
import type { UserAbsence } from "@/types/database";
import {
  absencesByDateKey,
  filterAbsencesByStatus,
  mapAbsencesForCalendar,
  maxAbsenceDate,
  normalizeAbsenceDates,
  presenceStatusForSave,
  resolveEffectivePresenceStatus,
  scheduledAbsenceStatusFromRows,
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

describe("resolveEffectivePresenceStatus", () => {
  it("shows in_office when leave is scheduled for a future date", () => {
    const result = resolveEffectivePresenceStatus(
      {
        user_id: "u1",
        status: "on_leave",
        note: "Annual leave",
        until_date: "2026-08-15",
        updated_by: null,
      },
      [{ absence_date: "2026-08-10", status: "on_leave" }],
      "2026-08-04",
    );
    expect(result.status).toBe("in_office");
    expect(result.until_date).toBeNull();
  });

  it("shows on_leave when today is an absence day", () => {
    const result = resolveEffectivePresenceStatus(
      {
        user_id: "u1",
        status: "on_leave",
        note: null,
        until_date: "2026-08-15",
        updated_by: null,
      },
      [
        { absence_date: "2026-08-04", status: "on_leave" },
        { absence_date: "2026-08-05", status: "on_leave" },
      ],
      "2026-08-04",
    );
    expect(result.status).toBe("on_leave");
    expect(result.until_date).toBe("2026-08-05");
  });

  it("reverts to in_office after leave ends", () => {
    const result = resolveEffectivePresenceStatus(
      {
        user_id: "u1",
        status: "on_leave",
        note: null,
        until_date: "2026-08-03",
        updated_by: null,
      },
      [{ absence_date: "2026-08-01", status: "on_leave" }],
      "2026-08-04",
    );
    expect(result.status).toBe("in_office");
    expect(result.until_date).toBeNull();
  });
});

describe("presenceStatusForSave", () => {
  it("stores in_office when all absence dates are in the future", () => {
    expect(
      presenceStatusForSave("on_leave", ["2026-08-10", "2026-08-11"], "2026-08-04"),
    ).toBe("in_office");
  });

  it("stores on_leave when today is included", () => {
    expect(
      presenceStatusForSave("on_leave", ["2026-08-04", "2026-08-05"], "2026-08-04"),
    ).toBe("on_leave");
  });
});

describe("scheduledAbsenceStatusFromRows", () => {
  it("returns on_leave when leave rows exist", () => {
    expect(
      scheduledAbsenceStatusFromRows([{ status: "on_leave" }]),
    ).toBe("on_leave");
  });

  it("returns null when no scheduled absences exist", () => {
    expect(scheduledAbsenceStatusFromRows([])).toBeNull();
  });
});
