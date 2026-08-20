import { describe, expect, it } from "vitest";
import type { AbsenceBlock, UserAbsence } from "@/types/database";
import {
  absenceBlocksToRows,
  absenceRowsToBlocks,
  absencesByDateKey,
  expandAbsenceBlock,
  filterAbsencesByStatus,
  mapAbsencesForCalendar,
  maxAbsenceDate,
  normalizeAbsenceDates,
  presenceNoteFromAbsenceRows,
  presenceStatusForSave,
  resolveEffectivePresenceStatus,
  scheduledAbsenceStatusFromRows,
  validateAbsenceBlocks,
  absenceSavePlan,
} from "./calendar-absences";

function block(partial: Partial<AbsenceBlock>): AbsenceBlock {
  return {
    id: "b1",
    start_date: "2026-08-10",
    end_date: "2026-08-10",
    note: "",
    ...partial,
  };
}

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

describe("absenceSavePlan", () => {
  it("writes leave rows when the form status is on_leave", () => {
    const plan = absenceSavePlan(
      "on_leave",
      [block({ note: "Family vacation" })],
      null,
    );
    expect(plan.statusesToReplace).toEqual(["on_leave"]);
    expect(plan.absenceRows).toEqual([
      {
        absence_date: "2026-08-10",
        status: "on_leave",
        note: "Family vacation",
      },
    ]);
  });

  it("keeps filed leave when the current status is back in office", () => {
    const plan = absenceSavePlan(
      "in_office",
      [block({ note: "Family vacation" })],
      "on_leave",
    );
    expect(plan.statusesToReplace).toEqual(["on_leave"]);
    expect(plan.absenceRows.map((row) => row.status)).toEqual(["on_leave"]);
    expect(plan.absenceRows.map((row) => row.note)).toEqual(["Family vacation"]);
  });

  it("does not wipe absences when in office with no prior leave", () => {
    const plan = absenceSavePlan("in_office", [], null);
    expect(plan.statusesToReplace).toEqual([]);
    expect(plan.absenceRows).toEqual([]);
  });

  it("clears leave only when the remaining dates are removed", () => {
    const plan = absenceSavePlan("in_office", [], "on_leave");
    expect(plan.statusesToReplace).toEqual(["on_leave"]);
    expect(plan.absenceRows).toEqual([]);
  });

  it("replaces leave with travel when switching scheduled types", () => {
    const plan = absenceSavePlan(
      "on_travel",
      [block({ note: "Conference" })],
      "on_leave",
    );
    expect(plan.statusesToReplace).toEqual(["on_travel", "on_leave"]);
    expect(plan.absenceRows[0]?.status).toBe("on_travel");
  });
});

describe("expandAbsenceBlock", () => {
  it("covers both ends of the range", () => {
    expect(
      expandAbsenceBlock({ start_date: "2026-08-10", end_date: "2026-08-12" }),
    ).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });

  it("crosses a month boundary", () => {
    expect(
      expandAbsenceBlock({ start_date: "2026-08-31", end_date: "2026-09-01" }),
    ).toEqual(["2026-08-31", "2026-09-01"]);
  });

  it("falls back to the start date when no end is set", () => {
    expect(
      expandAbsenceBlock({ start_date: "2026-08-10", end_date: "" }),
    ).toEqual(["2026-08-10"]);
  });

  it("returns nothing for a reversed or malformed range", () => {
    expect(
      expandAbsenceBlock({ start_date: "2026-08-12", end_date: "2026-08-10" }),
    ).toEqual([]);
    expect(
      expandAbsenceBlock({ start_date: "2026-02-31", end_date: "2026-02-31" }),
    ).toEqual([]);
  });
});

describe("absenceBlocksToRows", () => {
  it("keeps each block's note on its own days", () => {
    const rows = absenceBlocksToRows(
      [
        block({
          id: "b1",
          start_date: "2026-08-10",
          end_date: "2026-08-11",
          note: "Family vacation",
        }),
        block({
          id: "b2",
          start_date: "2026-09-01",
          end_date: "2026-09-01",
          note: "Medical appointment",
        }),
      ],
      "on_leave",
    );

    expect(rows).toEqual([
      {
        absence_date: "2026-08-10",
        status: "on_leave",
        note: "Family vacation",
      },
      {
        absence_date: "2026-08-11",
        status: "on_leave",
        note: "Family vacation",
      },
      {
        absence_date: "2026-09-01",
        status: "on_leave",
        note: "Medical appointment",
      },
    ]);
  });

  it("does not let a new leave overwrite an earlier leave's note", () => {
    const rows = absenceBlocksToRows(
      [
        block({
          id: "b1",
          start_date: "2026-08-10",
          end_date: "2026-08-10",
          note: "First",
        }),
        block({
          id: "b2",
          start_date: "2026-08-20",
          end_date: "2026-08-20",
          note: "Second",
        }),
      ],
      "on_leave",
    );
    expect(rows.map((row) => row.note)).toEqual(["First", "Second"]);
  });

  it("stores a blank note as null", () => {
    const rows = absenceBlocksToRows([block({ note: "   " })], "on_leave");
    expect(rows[0]?.note).toBeNull();
  });
});

describe("absenceRowsToBlocks", () => {
  it("merges consecutive days that share a note", () => {
    const blocks = absenceRowsToBlocks([
      { absence_date: "2026-08-10", note: "Family vacation" },
      { absence_date: "2026-08-11", note: "Family vacation" },
      { absence_date: "2026-08-12", note: "Family vacation" },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.start_date).toBe("2026-08-10");
    expect(blocks[0]?.end_date).toBe("2026-08-12");
    expect(blocks[0]?.note).toBe("Family vacation");
  });

  it("splits consecutive days that carry different notes", () => {
    const blocks = absenceRowsToBlocks([
      { absence_date: "2026-08-10", note: "Family vacation" },
      { absence_date: "2026-08-11", note: "Medical appointment" },
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.note)).toEqual([
      "Family vacation",
      "Medical appointment",
    ]);
  });

  it("splits on a gap in dates", () => {
    const blocks = absenceRowsToBlocks([
      { absence_date: "2026-08-10", note: "Trip" },
      { absence_date: "2026-08-20", note: "Trip" },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it("round-trips through absenceBlocksToRows", () => {
    const original = [
      block({
        id: "b1",
        start_date: "2026-08-10",
        end_date: "2026-08-12",
        note: "Family vacation",
      }),
      block({
        id: "b2",
        start_date: "2026-09-01",
        end_date: "2026-09-02",
        note: "Conference",
      }),
    ];
    const rebuilt = absenceRowsToBlocks(
      absenceBlocksToRows(original, "on_leave"),
    );
    expect(
      rebuilt.map(({ start_date, end_date, note }) => ({
        start_date,
        end_date,
        note,
      })),
    ).toEqual(
      original.map(({ start_date, end_date, note }) => ({
        start_date,
        end_date,
        note,
      })),
    );
  });
});

describe("validateAbsenceBlocks", () => {
  it("accepts separate, well-formed leaves", () => {
    expect(
      validateAbsenceBlocks([
        block({ id: "b1", start_date: "2026-08-10", end_date: "2026-08-12" }),
        block({ id: "b2", start_date: "2026-09-01", end_date: "2026-09-02" }),
      ]),
    ).toBeNull();
  });

  it("rejects an empty list", () => {
    expect(validateAbsenceBlocks([])).toMatch(/at least one/i);
  });

  it("rejects a missing start date", () => {
    expect(
      validateAbsenceBlocks([block({ start_date: "", end_date: "" })]),
    ).toMatch(/start date/i);
  });

  it("rejects an end date before its start", () => {
    expect(
      validateAbsenceBlocks([
        block({ start_date: "2026-08-12", end_date: "2026-08-10" }),
      ]),
    ).toMatch(/before/i);
  });

  it("rejects overlapping leaves", () => {
    expect(
      validateAbsenceBlocks([
        block({ id: "b1", start_date: "2026-08-10", end_date: "2026-08-12" }),
        block({ id: "b2", start_date: "2026-08-12", end_date: "2026-08-14" }),
      ]),
    ).toMatch(/same date/i);
  });

  it("rejects a range long enough to look like a typo", () => {
    expect(
      validateAbsenceBlocks([
        block({ start_date: "2026-08-10", end_date: "2036-08-10" }),
      ]),
    ).toMatch(/longer than/i);
  });
});

describe("presenceNoteFromAbsenceRows", () => {
  it("uses today's note when the leave is under way", () => {
    expect(
      presenceNoteFromAbsenceRows(
        [
          { absence_date: "2026-08-04", note: "Family vacation" },
          { absence_date: "2026-09-01", note: "Conference" },
        ],
        "2026-08-04",
      ),
    ).toBe("Family vacation");
  });

  it("uses the next upcoming note when nothing is active", () => {
    expect(
      presenceNoteFromAbsenceRows(
        [
          { absence_date: "2026-08-01", note: "Family vacation" },
          { absence_date: "2026-09-01", note: "Conference" },
        ],
        "2026-08-04",
      ),
    ).toBe("Conference");
  });

  it("falls back to the last note when every absence has passed", () => {
    expect(
      presenceNoteFromAbsenceRows(
        [{ absence_date: "2026-08-01", note: "Family vacation" }],
        "2026-08-04",
      ),
    ).toBe("Family vacation");
  });

  it("returns null with no rows", () => {
    expect(presenceNoteFromAbsenceRows([], "2026-08-04")).toBeNull();
  });
});
