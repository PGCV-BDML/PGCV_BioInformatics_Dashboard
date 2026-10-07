import { describe, expect, it } from "vitest";
import { AUDIENCES, resolveText } from "@/lib/tour";
import { DEG_HEATMAP, DEG_SAMPLES, META_SAMPLES, META_TAXA, SHOWCASE_COPY, VOLCANO } from "@/lib/tour-showcase";

describe("tour showcase sample data", () => {
  it("gives every service its own copy for each audience", () => {
    expect(SHOWCASE_COPY.map((c) => c.id)).toEqual(["barcoding", "assembly", "metagenomics", "transcriptomics"]);
    for (const item of SHOWCASE_COPY) {
      const titles = AUDIENCES.map((a) => resolveText(item.title, a));
      const captions = new Set(AUDIENCES.map((a) => resolveText(item.caption, a)));
      expect(titles.every(Boolean)).toBe(true);
      expect(captions.size).toBe(AUDIENCES.length);
    }
  });

  it("makes each metagenomic sample add up to 100%", () => {
    for (const sample of META_SAMPLES) {
      expect(sample.abundance).toHaveLength(META_TAXA.length);
      expect(sample.abundance.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
    }
  });

  it("labels the most significant genes on both sides of the volcano", () => {
    const labelled = VOLCANO.filter((p) => p.gene);
    expect(labelled.filter((p) => p.change === "up")).toHaveLength(3);
    expect(labelled.filter((p) => p.change === "down")).toHaveLength(3);
  });

  it("keeps heatmap z-scores within the colour scale", () => {
    for (const row of DEG_HEATMAP) {
      expect(row.z).toHaveLength(DEG_SAMPLES.length);
      expect(row.z.every((z) => z >= -2 && z <= 2)).toBe(true);
    }
  });
});
