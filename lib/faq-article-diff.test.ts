import { describe, expect, it } from "vitest";
import {
  diffFaqBodyLines,
  diffFaqTags,
  diffFaqTitle,
  faqDiffHasChanges,
} from "./faq-article-diff";

describe("FAQ article diffs", () => {
  it("treats identical snapshots as unchanged", () => {
    const title = diffFaqTitle("Load conda on HPC", "Load conda on HPC");
    const body = diffFaqBodyLines("module load miniconda3", "module load miniconda3");
    const tags = diffFaqTags(["conda", "hpc"], ["conda", "hpc"]);
    expect(faqDiffHasChanges(title)).toBe(false);
    expect(faqDiffHasChanges(body)).toBe(false);
    expect(tags.added).toEqual([]);
    expect(tags.removed).toEqual([]);
    expect(tags.unchanged).toEqual(["conda", "hpc"]);
  });

  it("marks title word replacements", () => {
    const tokens = diffFaqTitle("Load conda on HPC", "Load mamba on HPC");
    expect(tokens).toEqual([
      { type: "equal", value: "Load" },
      { type: "equal", value: " " },
      { type: "remove", value: "conda" },
      { type: "add", value: "mamba" },
      { type: "equal", value: " " },
      { type: "equal", value: "on" },
      { type: "equal", value: " " },
      { type: "equal", value: "HPC" },
    ]);
  });

  it("marks added and removed body lines", () => {
    const tokens = diffFaqBodyLines(
      "module load miniconda3\nconda activate qiime2",
      "module load miniconda3\nmamba activate qiime2",
    );
    expect(tokens).toEqual([
      { type: "equal", value: "module load miniconda3" },
      { type: "remove", value: "conda activate qiime2" },
      { type: "add", value: "mamba activate qiime2" },
    ]);
  });

  it("splits tag adds and removes", () => {
    expect(diffFaqTags(["conda", "hpc"], ["conda", "python"])).toEqual({
      added: ["python"],
      removed: ["hpc"],
      unchanged: ["conda"],
    });
  });
});
