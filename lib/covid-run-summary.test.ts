import { describe, expect, it } from "vitest";
import {
  availableRunYears,
  getCovidRunSummaryStats,
  lineageUnassigned,
  pctAssigned,
  runYear,
  turnaroundDays,
} from "./covid-run-summary";
import type { CovidSequencingRun } from "@/types/database";

function row(
  overrides: Partial<CovidSequencingRun> = {},
): CovidSequencingRun {
  return {
    id: "1",
    run_number: 1,
    run_id: "NS_001",
    sequencer: "NextSeq1000",
    extraction_number: "1",
    date_received: "2022-02-16",
    date_loaded: "2022-02-18",
    samples_sequenced: 90,
    lineage_assigned: 88,
    uploaded_gisaid: true,
    uploaded_islap: true,
    comments: null,
    review_flag: null,
    ...overrides,
  };
}

describe("turnaroundDays", () => {
  it("returns day difference", () => {
    expect(turnaroundDays("2022-02-16", "2022-02-18")).toBe(2);
  });

  it("allows negative when loaded before received", () => {
    expect(turnaroundDays("2024-01-11", "2023-12-01")).toBe(-41);
  });

  it("returns null when a date is missing", () => {
    expect(turnaroundDays(null, "2022-02-18")).toBeNull();
    expect(turnaroundDays("2022-02-16", null)).toBeNull();
  });
});

describe("lineage helpers", () => {
  it("computes unassigned and percent", () => {
    expect(lineageUnassigned(row())).toBe(2);
    expect(pctAssigned(row())).toBeCloseTo(97.777, 2);
  });

  it("returns null percent when samples are zero", () => {
    expect(pctAssigned(row({ samples_sequenced: 0 }))).toBeNull();
  });
});

describe("getCovidRunSummaryStats", () => {
  it("aggregates counts", () => {
    const stats = getCovidRunSummaryStats([
      row(),
      row({
        id: "2",
        run_number: 2,
        uploaded_gisaid: false,
        uploaded_islap: false,
        review_flag: "missing id",
        samples_sequenced: 10,
        lineage_assigned: 8,
      }),
    ]);
    expect(stats).toEqual({
      totalRuns: 2,
      totalSamples: 100,
      totalLineageAssigned: 96,
      pctLineageAssigned: 96,
      gisaidUploaded: 1,
      islapUploaded: 1,
      reviewFlagged: 1,
    });
  });
});

describe("runYear / availableRunYears", () => {
  it("prefers date_loaded", () => {
    expect(
      runYear(row({ date_loaded: "2025-01-21", date_received: "2024-12-01" })),
    ).toBe("2025");
  });

  it("lists unique years descending", () => {
    expect(
      availableRunYears([
        row({ date_loaded: "2022-01-27" }),
        row({ id: "2", date_loaded: "2024-03-08" }),
        row({ id: "3", date_loaded: "2022-06-01" }),
      ]),
    ).toEqual(["2024", "2022"]);
  });
});
