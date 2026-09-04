import { describe, expect, it } from "vitest";
import {
  applySharedHost,
  catalogHrefById,
  displayGeneratorHref,
  isGeneratorHrefReady,
  mergeGeneratorHrefs,
  normalizeGeneratorHref,
  normalizeHostInput,
  replaceGeneratorHost,
  SERVICE_REPORT_GENERATORS,
  sharedGeneratorHost,
} from "./service-report-generators";

describe("SERVICE_REPORT_GENERATORS", () => {
  it("includes the core analysis generators with unique ids", () => {
    const ids = SERVICE_REPORT_GENERATORS.map((g) => g.id);
    expect(ids).toEqual([
      "amplicon-assembly",
      "whole-genome-assembly",
      "16s-metabarcoding",
      "custom-service-report",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points Amplicon Assembly at the LAN generator", () => {
    const amplicon = SERVICE_REPORT_GENERATORS.find(
      (g) => g.id === "amplicon-assembly",
    );
    expect(amplicon?.href).toBe("http://10.49.42.113:5050");
    expect(isGeneratorHrefReady(amplicon?.href)).toBe(true);
  });

  it("points Whole Genome Assembly at the LAN generator", () => {
    const wgs = SERVICE_REPORT_GENERATORS.find(
      (g) => g.id === "whole-genome-assembly",
    );
    expect(wgs?.href).toBe("http://10.49.42.113:5051");
    expect(isGeneratorHrefReady(wgs?.href)).toBe(true);
  });

  it("points 16s Metabarcoding at the LAN generator", () => {
    const metabarcoding = SERVICE_REPORT_GENERATORS.find(
      (g) => g.id === "16s-metabarcoding",
    );
    expect(metabarcoding?.href).toBe("http://10.49.42.113:5070");
    expect(isGeneratorHrefReady(metabarcoding?.href)).toBe(true);
  });

  it("points Custom Service Report Generator at localhost", () => {
    const custom = SERVICE_REPORT_GENERATORS.find(
      (g) => g.id === "custom-service-report",
    );
    expect(custom?.href).toBe("http://127.0.0.1:8000");
    expect(custom?.shareHost).toBe(false);
    expect(isGeneratorHrefReady(custom?.href)).toBe(true);
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

describe("mergeGeneratorHrefs", () => {
  it("keeps catalog fallbacks when nothing is stored", () => {
    expect(mergeGeneratorHrefs([])).toEqual(catalogHrefById());
    expect(mergeGeneratorHrefs(null)).toEqual(catalogHrefById());
  });

  it("overlays stored hrefs and ignores unknown ids", () => {
    const merged = mergeGeneratorHrefs([
      { id: "amplicon-assembly", href: "http://10.0.0.9:5050" },
      { id: "unknown-tool", href: "http://example.test" },
      { id: "16s-metabarcoding", href: "" },
    ]);
    expect(merged["amplicon-assembly"]).toBe("http://10.0.0.9:5050");
    expect(merged["whole-genome-assembly"]).toBe(
      "http://10.49.42.113:5051",
    );
    expect(merged["16s-metabarcoding"]).toBe("");
    expect(merged["unknown-tool"]).toBeUndefined();
  });
});

describe("shared generator host", () => {
  it("normalizes a typed IP or URL down to the hostname", () => {
    expect(normalizeHostInput("http://10.49.42.200:5050")).toBe(
      "10.49.42.200",
    );
    expect(normalizeHostInput("10.49.42.200")).toBe("10.49.42.200");
  });

  it("returns the shared host when every generator uses the same machine", () => {
    expect(sharedGeneratorHost(catalogHrefById())).toBe("10.49.42.113");
    expect(
      sharedGeneratorHost({
        "amplicon-assembly": "http://10.0.0.1:5050",
        "whole-genome-assembly": "http://10.0.0.2:5051",
        "16s-metabarcoding": "http://10.0.0.1:5070",
      }),
    ).toBe("");
  });

  it("replaces the hostname and keeps the port", () => {
    expect(
      replaceGeneratorHost("http://10.49.42.113:5050", "10.49.42.200"),
    ).toBe("http://10.49.42.200:5050");
    expect(replaceGeneratorHost("10.49.42.113:5070", "lab.local")).toBe(
      "http://lab.local:5070",
    );
  });

  it("applies a new lab host to every catalog generator", () => {
    const next = applySharedHost(catalogHrefById(), "10.49.42.200");
    expect(next["amplicon-assembly"]).toBe("http://10.49.42.200:5050");
    expect(next["whole-genome-assembly"]).toBe("http://10.49.42.200:5051");
    expect(next["16s-metabarcoding"]).toBe("http://10.49.42.200:5070");
    expect(next["custom-service-report"]).toBe("http://127.0.0.1:8000");
  });
});

describe("displayGeneratorHref", () => {
  it("strips the scheme for the card footer", () => {
    expect(displayGeneratorHref("http://10.49.42.113:5050")).toBe(
      "10.49.42.113:5050",
    );
    expect(displayGeneratorHref("")).toBe("");
  });
});
