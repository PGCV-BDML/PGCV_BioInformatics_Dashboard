import { describe, expect, it } from "vitest";
import { isSafeTourVirusPath, parseTourVirusData, parseVirusScene, slimSpikePdb } from "@/lib/tour-virus";

const mutation = (name: string, firstMonth: string, extra: Record<string, unknown> = {}) => ({
  name,
  firstMonth,
  count: 10,
  region: "Spike S1 region",
  description: `About ${name}`,
  ...extra,
});

describe("isSafeTourVirusPath", () => {
  it("only allows pgc-covid-exhibit files of the expected type", () => {
    expect(isSafeTourVirusPath("pgc-covid-exhibit/models/virus-scene.json", "json")).toBe(true);
    expect(isSafeTourVirusPath("pgc-covid-exhibit/models/spike-7KJ2.pdb", "pdb")).toBe(true);
    expect(isSafeTourVirusPath("pgc-covid-exhibit/models/spike-7KJ2.pdb", "json")).toBe(false);
    expect(isSafeTourVirusPath("pgc-covid-exhibit/../tour.json", "json")).toBe(false);
    expect(isSafeTourVirusPath("images/x.json", "json")).toBe(false);
    expect(isSafeTourVirusPath("pgc-covid-exhibit/.git/config.json", "json")).toBe(false);
  });
});

describe("parseTourVirusData", () => {
  it("keeps reviewed-out and malformed mutations off and sorts by first month", () => {
    const summary = parseTourVirusData({
      schemaVersion: 1,
      sampleCount: 5903,
      coverageStart: "January 2022",
      coverageEnd: "September 2023",
      mutations: [
        mutation("L452R", "2022-06"),
        mutation("D614G", "2022-01", { count: 5861 }),
        mutation("N501Y", "2022-01"),
        mutation("E484K", "2022-02", { requiresReview: true }),
        mutation("not-a-mutation", "2022-03"),
        mutation("K417N", "2022-13"),
      ],
      structure: { id: "7KJ2", url: "https://www.rcsb.org/structure/7KJ2", residueChains: { "614": ["A", "C", "Z"] } },
    });
    expect(summary?.mutations.map((m) => m.name)).toEqual(["D614G", "N501Y", "L452R"]);
    expect(summary?.mutations[0]).toMatchObject({ position: 614, count: 5861, chains: ["A", "C"] });
    expect(summary?.mutations[1]?.chains).toEqual([]);
    expect(summary?.coverage).toBe("January 2022 – September 2023");
    expect(summary?.structure.url).toBe("https://www.rcsb.org/structure/7KJ2");
  });

  it("returns null for anything else", () => {
    expect(parseTourVirusData(null)).toBeNull();
    expect(parseTourVirusData({ schemaVersion: 2, mutations: [mutation("D614G", "2022-01")] })).toBeNull();
    expect(parseTourVirusData({ schemaVersion: 1, mutations: [] })).toBeNull();
  });
});

describe("parseVirusScene", () => {
  it("assigns colour roles and drops bad shapes", () => {
    const shapes = parseVirusScene({
      schemaVersion: 1,
      shapes: [
        { kind: "sphere", component: "lipid envelope", center: [0, 0, 0], radius: 450, color: "#789879" },
        { kind: "cylinder", component: "spike", start: [0, 1, 0], end: [0, 2, 0], radius: 14, highlighted: true },
        { kind: "sphere", component: "spike", center: [0, 2, 0], radius: 39 },
        { kind: "sphere", component: "spike", center: [0, "x", 0], radius: 39 },
        { kind: "cone", center: [0, 0, 0], radius: 1 },
      ],
    });
    expect(shapes?.map((s) => s.role)).toEqual(["envelope", "highlightStem", "lobe"]);
    expect(shapes?.[0]).not.toHaveProperty("color");
  });
});

describe("slimSpikePdb", () => {
  it("keeps only spike-chain ATOM records", () => {
    const pdb = [
      "HEADER    VIRAL PROTEIN",
      "ATOM      1  N   ALA A  27     202.965 254.090 182.165  1.00 53.77           N  ",
      "ATOM      2  N   ALA D  27     202.965 254.090 182.165  1.00 53.77           N  ",
      "HETATM    3  C1  NAG B 901     202.965 254.090 182.165  1.00 53.77           C  ",
      "END",
    ].join("\n");
    expect(slimSpikePdb(pdb)?.split("\n").filter(Boolean)).toEqual([expect.stringContaining("ALA A"), "END"]);
    expect(slimSpikePdb("HEADER only")).toBeNull();
  });
});
