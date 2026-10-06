import { describe, expect, it } from "vitest";
import { expandLineage, lineageGroup, LINEAGE_GROUPS, monthMidpoint, slimAuspice } from "@/scripts/slim-auspice.mjs";
import {
  isSafeTourPhyloPath,
  layoutPhylo,
  monthKey,
  monthlyCounts,
  parseTourPhylo,
  serializeTourPhylo,
  summarizePhylo,
  TourPhyloError,
} from "@/lib/tour-phylo";

function tip(name: string, date: number, lineage: string, province: string) {
  return {
    name,
    node_attrs: {
      num_date: { value: date },
      pangolin_lineage: { value: lineage },
      province: { value: province },
      age: { value: "34" },
      sex: { value: "F" },
      health_status: { value: "SEVERE" },
      city_municipality: { value: "ILOILO CITY" },
      "originating lab": { value: "SOME HOSPITAL" },
    },
    branch_attrs: { mutations: { nuc: ["C241T"] } },
  };
}

// 25 Iloilo tips (two lineages) and one Aklan tip under a single root.
function auspiceBuild() {
  const iloilo = Array.from({ length: 25 }, (_, i) =>
    tip(`WV_${1000 + i}_2022`, 2022.1 + i * 0.01, i % 2 ? "BA.5.2" : "CM.8.1", "ILOILO"),
  );
  return {
    version: "v2",
    meta: { title: "Test build", updated: "2023-10-26" },
    tree: {
      name: "root",
      node_attrs: { num_date: { value: 2021.5 }, div: 0 },
      children: [
        { name: "NODE_1", node_attrs: { num_date: { value: 2021.9 } }, children: iloilo },
        tip("WV_9999_2023", 2023.2, "XBB.1.16", "AKLAN"),
      ],
    },
  };
}

describe("slim-auspice", () => {
  it("expands Pango aliases and groups lineages", () => {
    expect(expandLineage("CM.8.1")).toBe("B.1.1.529.2.3.20.8.1");
    expect(expandLineage("FU.2")).toBe("XBB.1.16.1.2");
    expect(expandLineage("ZZ.1")).toBeNull();
    const id = (l: string | null) => LINEAGE_GROUPS[lineageGroup(l)]?.id;
    expect(id("B.1.617.2")).toBe("pre-omicron");
    expect(id("BA.1")).toBe("ba1");
    expect(id("CM.8.1")).toBe("ba2");
    expect(id("BQ.1.1")).toBe("ba45");
    expect(id("GJ.1")).toBe("xbb");
    expect(id("XBB.1.5.48")).toBe("xbb15");
    expect(id("EG.5.1")).toBe("xbb19");
    expect(id("XBB.1.16")).toBe("xbb116");
    expect(id("XBC.1")).toBe("other");
    expect(id(null)).toBe("other");
  });

  it("rounds dates to the middle of the month", () => {
    expect(monthKey(monthMidpoint(2022.04))).toBe("2022-01");
    expect(monthMidpoint(2022.99)).toBeCloseTo(2022 + 11.5 / 12);
  });

  it("drops names, mutations and patient fields, and merges small provinces", () => {
    const { result } = slimAuspice(auspiceBuild(), { minProvince: 20, generated: "2026-10-06" });
    const text = JSON.stringify(result);
    for (const leaked of ["WV_", "NODE_1", "C241T", "SEVERE", "ILOILO CITY", "HOSPITAL", "\"age\"", "\"sex\"", "Aklan"]) {
      expect(text).not.toContain(leaked);
    }
    expect(result.provinces).toEqual(["Iloilo", "Other"]);
    expect(result.source).toEqual({ title: "Test build", updated: "2023-10-26" });
    // The slim file round-trips through the page's parser.
    const summary = summarizePhylo(parseTourPhylo(result));
    expect(summary.tipCount).toBe(26);
    expect(summary.provinces).toEqual([
      { name: "Iloilo", count: 25 },
      { name: "Other", count: 1 },
    ]);
    expect(summary.lastMonth).toBe("2023-03");
  });
});

describe("parseTourPhylo", () => {
  it("rejects a raw Auspice build", () => {
    expect(() => parseTourPhylo(auspiceBuild())).toThrow(TourPhyloError);
  });

  it("copies only allowlisted node fields", () => {
    const parsed = parseTourPhylo({
      format: "pgcv-tour-phylo",
      version: 1,
      groups: [{ id: "ba2", label: "Omicron BA.2" }],
      provinces: ["Iloilo"],
      lineages: ["BA.2"],
      tree: { d: 2022, g: 0, p: 0, name: "secret", c: [{ d: 2022.5, g: 0, p: 0, l: 0, age: 40 }] },
    });
    expect(parsed.tree).toEqual({ d: 2022, g: 0, p: 0, c: [{ d: 2022.5, g: 0, p: 0, l: 0 }] });
    // What /api/tour/phylo sends must pass the same check in the browser.
    expect(parseTourPhylo(serializeTourPhylo(parsed))).toEqual(parsed);
  });

  it("rejects out-of-range indices and suspicious labels", () => {
    const base = { format: "pgcv-tour-phylo", version: 1, groups: [{ id: "a", label: "A" }], lineages: [] };
    expect(() => parseTourPhylo({ ...base, provinces: ["Iloilo"], tree: { d: 2022, g: 1, p: 0 } })).toThrow(TourPhyloError);
    expect(() => parseTourPhylo({ ...base, provinces: ["<script>"], tree: { d: 2022, g: 0, p: 0 } })).toThrow(TourPhyloError);
  });

  it("only accepts nextstrain/*.json paths", () => {
    expect(isSafeTourPhyloPath("nextstrain/tree.json")).toBe(true);
    expect(isSafeTourPhyloPath("tour.json")).toBe(false);
    expect(isSafeTourPhyloPath("nextstrain/../tour.json")).toBe(false);
    expect(isSafeTourPhyloPath("nextstrain/.hidden.json")).toBe(false);
  });
});

describe("layoutPhylo", () => {
  const phylo = parseTourPhylo({
    format: "pgcv-tour-phylo",
    version: 1,
    groups: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    provinces: ["Iloilo", "Other"],
    lineages: [],
    tree: {
      d: 2022,
      g: 0,
      p: 0,
      c: [
        { d: 2022.1, g: 0, p: 0 },
        { d: 2022.2, g: 1, p: 0, c: [{ d: 2022.3, g: 1, p: 1 }, { d: 2022.45, g: 1, p: 0 }] },
      ],
    },
  });

  it("places tips in order and internal nodes between their children", () => {
    const layout = layoutPhylo(phylo);
    expect(layout.tips.map((i) => layout.y[i])).toEqual([0, 1, 2]);
    expect(layout.y[2]).toBe(1.5); // inner clade
    expect(layout.y[0]).toBe((0 + 1.5) / 2); // root
    expect(Array.from(layout.parent)).toEqual([-1, 0, 0, 2, 2]);
  });

  it("counts tips per month with gaps filled", () => {
    const rows = monthlyCounts(layoutPhylo(phylo), "group", 2);
    expect(rows.map((r) => r.month)).toEqual(["2022-02", "2022-03", "2022-04", "2022-05", "2022-06"]);
    expect(rows[0]!.counts).toEqual([1, 0]);
    expect(rows[1]!.counts).toEqual([0, 0]);
    expect(rows[2]!.counts).toEqual([0, 1]);
  });
});
