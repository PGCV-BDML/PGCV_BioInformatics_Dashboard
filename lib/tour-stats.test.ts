import { describe, expect, it } from "vitest";
import { parseTourCovidStats, toQuarters } from "@/lib/tour-stats";

describe("toQuarters", () => {
  it("sums months into quarters and fills gaps with zero", () => {
    expect(
      toQuarters([
        { month: "2022-01", samples: 93 },
        { month: "2022-03", samples: 7 },
        { month: "2022-08", samples: 50 },
        { month: "bad", samples: 999 },
      ]),
    ).toEqual([
      { label: "Q1 2022", samples: 100 },
      { label: "Q2 2022", samples: 0 },
      { label: "Q3 2022", samples: 50 },
    ]);
  });

  it("crosses year boundaries", () => {
    expect(toQuarters([{ month: "2022-12", samples: 1 }, { month: "2023-01", samples: 2 }])).toEqual([
      { label: "Q4 2022", samples: 1 },
      { label: "Q1 2023", samples: 2 },
    ]);
  });

  it("returns nothing for no data", () => {
    expect(toQuarters([])).toEqual([]);
  });
});

describe("parseTourCovidStats", () => {
  it("maps the RPC payload", () => {
    const stats = parseTourCovidStats({
      total_runs: 85,
      total_samples: 4000,
      lineage_assigned: 3600,
      samples_with_lineage_data: 3800,
      first_run_date: "2022-01-27",
      last_run_date: "2023-06-30",
      monthly: [{ month: "2022-01", samples: 93, runs: 1 }],
    });
    expect(stats).toMatchObject({
      totalRuns: 85,
      totalSamples: 4000,
      lineageAssigned: 3600,
      firstRunDate: "2022-01-27",
      quarterly: [{ label: "Q1 2022", samples: 93 }],
    });
    expect(stats?.pctLineageAssigned).toBeCloseTo(94.74, 1);
  });

  it("leaves the rate empty when no run recorded lineage data", () => {
    const stats = parseTourCovidStats({ total_runs: 2, total_samples: 10, lineage_assigned: 0, samples_with_lineage_data: 0, monthly: [] });
    expect(stats?.pctLineageAssigned).toBeNull();
  });

  it("returns null for an empty table or a malformed payload", () => {
    expect(parseTourCovidStats({ total_runs: 0 })).toBeNull();
    expect(parseTourCovidStats(null)).toBeNull();
    expect(parseTourCovidStats([1, 2])).toBeNull();
  });
});
