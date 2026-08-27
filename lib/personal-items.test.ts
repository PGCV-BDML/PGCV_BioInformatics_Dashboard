import { describe, expect, it } from "vitest";
import { matchesVisibilityFilter } from "./personal-items";

describe("matchesVisibilityFilter", () => {
  it("All keeps both team and personal rows", () => {
    expect(matchesVisibilityFilter(false, "all")).toBe(true);
    expect(matchesVisibilityFilter(true, "all")).toBe(true);
  });

  it("Team hides personal rows", () => {
    expect(matchesVisibilityFilter(false, "team")).toBe(true);
    expect(matchesVisibilityFilter(true, "team")).toBe(false);
  });

  it("Personal keeps only personal rows", () => {
    expect(matchesVisibilityFilter(false, "personal")).toBe(false);
    expect(matchesVisibilityFilter(true, "personal")).toBe(true);
  });
});
