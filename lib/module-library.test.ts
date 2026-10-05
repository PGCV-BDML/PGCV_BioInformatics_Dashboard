import { describe, expect, it } from "vitest";
import {
  groupLibraryItems,
  isSafeModuleId,
  isSafeRepoPath,
  moduleIdFromModuleLink,
  moduleLinkForId,
  moduleLinkForPath,
  parseModuleManifest,
  repoPathFromModuleLink,
} from "@/lib/module-library";

describe("parseModuleManifest", () => {
  it("maps modules.json entries in teaching order and skips unfinished ones", () => {
    const items = parseModuleManifest({
      modules: [
        {
          id: "basic-coding",
          name: "Basic Coding",
          folder: "Basic-Coding",
          entry: "basic-coding-module.html",
          track: "Foundations",
          level: "Beginner",
          duration: "≈ 3 hours",
          summary: "Linux basics.",
        },
        {
          id: "intro-bioinformatics",
          name: "Introduction to Bioinformatics",
          folder: "Introduction-to-Bioinformatics",
          entry: null,
          track: "Foundations",
        },
        {
          id: "ggdc",
          name: "GGDC Guide",
          folder: "Whole-Genome-Assembly",
          entry: "other-downstream-analyses/ggdc-guide.html",
          track: "Genomics",
          dataset: "dataset/",
        },
      ],
    });

    expect(items).toEqual([
      {
        id: "basic-coding",
        title: "Basic Coding",
        path: "Basic-Coding/basic-coding-module.html",
        group: "Foundations",
        level: "Beginner",
        duration: "≈ 3 hours",
        summary: "Linux basics.",
        hasDataset: false,
        retired: false,
      },
      {
        id: "ggdc",
        title: "GGDC Guide",
        path: "Whole-Genome-Assembly/other-downstream-analyses/ggdc-guide.html",
        group: "Genomics",
        level: null,
        duration: null,
        summary: null,
        hasDataset: true,
        retired: false,
      },
    ]);
  });

  it("keeps retired modules but flags them", () => {
    const [item] = parseModuleManifest({
      modules: [
        {
          id: "wga-hands-on",
          name: "Whole Genome Assembly (hands-on only)",
          folder: "Whole-Genome-Assembly",
          entry: "whole-genome-assembly-module-hands-on.html",
          retired: { target: "whole-genome-assembly-module-with-lecture.html#part=2" },
        },
      ],
    });
    expect(item?.id).toBe("wga-hands-on");
    expect(item?.retired).toBe(true);
  });

  it("drops unsafe paths and tolerates junk input", () => {
    expect(parseModuleManifest(null)).toEqual([]);
    expect(parseModuleManifest({ modules: "nope" })).toEqual([]);
    expect(
      parseModuleManifest({
        modules: [{ id: "x", name: "X", folder: "..", entry: "secret.html" }],
      }),
    ).toEqual([]);
  });
});

describe("isSafeRepoPath", () => {
  it("allows normal module paths", () => {
    expect(isSafeRepoPath("DNA-Barcoding/dataset/sample_R1.fastq.gz")).toBe(true);
    expect(isSafeRepoPath("index.html")).toBe(true);
  });

  it("blocks traversal, hidden files and odd separators", () => {
    expect(isSafeRepoPath("../etc/passwd")).toBe(false);
    expect(isSafeRepoPath("DNA-Barcoding/../../x")).toBe(false);
    expect(isSafeRepoPath(".git/config")).toBe(false);
    expect(isSafeRepoPath("a/.env")).toBe(false);
    expect(isSafeRepoPath("/abs.html")).toBe(false);
    expect(isSafeRepoPath("a//b.html")).toBe(false);
    expect(isSafeRepoPath("a\\b.html")).toBe(false);
    expect(isSafeRepoPath("")).toBe(false);
  });
});

describe("module links", () => {
  it("round-trips repo paths and ignores other links", () => {
    const link = moduleLinkForPath("Basic-Coding/basic-coding-module.html");
    expect(link).toBe("github:Basic-Coding/basic-coding-module.html");
    expect(repoPathFromModuleLink(link)).toBe(
      "Basic-Coding/basic-coding-module.html",
    );
    expect(repoPathFromModuleLink("/assets/Training/x.html")).toBeNull();
    expect(repoPathFromModuleLink("github:../x.html")).toBeNull();
    expect(repoPathFromModuleLink(null)).toBeNull();
  });
});

describe("module id links", () => {
  it("round-trips modules.json ids", () => {
    const link = moduleLinkForId("16s-metagenomics");
    expect(link).toBe("github-module:16s-metagenomics");
    expect(moduleIdFromModuleLink(link)).toBe("16s-metagenomics");
  });

  it("keeps id links and path links apart", () => {
    expect(moduleIdFromModuleLink("github:Basic-Coding/x.html")).toBeNull();
    expect(repoPathFromModuleLink("github-module:basic-coding")).toBeNull();
    expect(moduleIdFromModuleLink("/assets/Training/x.html")).toBeNull();
    expect(moduleIdFromModuleLink(null)).toBeNull();
  });

  it("rejects ids that aren't plain slugs", () => {
    expect(isSafeModuleId("wga-hands-on")).toBe(true);
    expect(isSafeModuleId("../x")).toBe(false);
    expect(isSafeModuleId("a/b")).toBe(false);
    expect(isSafeModuleId("")).toBe(false);
    expect(moduleIdFromModuleLink("github-module:../x")).toBeNull();
  });
});

describe("groupLibraryItems", () => {
  it("keeps first-seen track order", () => {
    const base = {
      level: null,
      duration: null,
      summary: null,
      hasDataset: false,
      retired: false,
    };
    const groups = groupLibraryItems([
      { ...base, id: "a", title: "A", path: "A/a.html", group: "Foundations" },
      { ...base, id: "b", title: "B", path: "B/b.html", group: "Genomics" },
      { ...base, id: "c", title: "C", path: "C/c.html", group: "Foundations" },
    ]);
    expect(groups.map(([g, items]) => [g, items.map((i) => i.id)])).toEqual([
      ["Foundations", ["a", "c"]],
      ["Genomics", ["b"]],
    ]);
  });
});
