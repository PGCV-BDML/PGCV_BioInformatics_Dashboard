import { describe, expect, it } from "vitest";
import {
  isGeneratorHrefReady,
  normalizeGeneratorHref,
  SERVICE_REPORT_GENERATORS,
} from "./service-report-generators";

describe("SERVICE_REPORT_GENERATORS", () => {
  it("includes the core analysis generators with unique ids", () => {
    const ids = SERVICE_REPORT_GENERATORS.map((g) => g.id);
    expect(ids).toEqual([
      "amplicon-assembly",
      "whole-genome-assembly",
      "16s-metabarcoding",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points Whole Genome Assembly at the LAN generator", () => {
    const wgs = SERVICE_REPORT_GENERATORS.find(
      (g) => g.id === "whole-genome-assembly",
    );
    expect(wgs?.href).toBe("http://10.49.42.66:5051");
    expect(isGeneratorHrefReady(wgs?.href)).toBe(true);
  });
});

describe("normalizeGeneratorHref", () => {
  it("returns empty for blank values", () => {
    expect(normalizeGeneratorHref("")).toBe("");
    expect(normalizeGeneratorHref("   ")).toBe("");
    expect(normalizeGeneratorHref(null)).toBe("");
  });

  it("keeps full URLs and app paths", () => {
    expect(normalizeGeneratorHref("https://reports.pgcv.local/amplicon")).toBe(
      "https://reports.pgcv.local/amplicon",
    );
    expect(normalizeGeneratorHref("/internal/wgs")).toBe("/internal/wgs");
  });

  it("prefixes bare IPs and host:port values with http://", () => {
    expect(normalizeGeneratorHref("192.168.1.20:8080")).toBe(
      "http://192.168.1.20:8080",
    );
    expect(normalizeGeneratorHref(" generator.lab ")).toBe(
      "http://generator.lab",
    );
  });
});

describe("isGeneratorHrefReady", () => {
  it("is false until a destination is set", () => {
    expect(isGeneratorHrefReady("")).toBe(false);
    expect(isGeneratorHrefReady("http://10.0.0.8:3001")).toBe(true);
  });
});
