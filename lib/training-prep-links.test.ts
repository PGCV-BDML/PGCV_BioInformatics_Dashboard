import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  nextPrepLinkSortOrder,
  normalizeTrainingPrepLinkUrl,
  validateTrainingPrepLinkTitle,
  validateTrainingPrepLinkUrl,
} from "./training-prep-links";

describe("training prep link SQL", () => {
  it("creates the staff-only links table", () => {
    const sql = readFileSync(
      join(
        __dirname,
        "../supabase/migrations/20260907130000_training_prep_link.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.training_prep_link");
    expect(sql).toContain("training_prep_link_title_chk");
    expect(sql).toContain("training_prep_link_url_chk");
  });
});

describe("validateTrainingPrepLinkTitle", () => {
  it("requires a non-empty title", () => {
    expect(validateTrainingPrepLinkTitle("  ")).toMatch(/title/);
    expect(validateTrainingPrepLinkTitle("Invitation letter")).toBeNull();
  });

  it("rejects titles that are too long", () => {
    expect(validateTrainingPrepLinkTitle("x".repeat(201))).toMatch(/200/);
  });
});

describe("normalizeTrainingPrepLinkUrl", () => {
  it("prefixes a scheme when the paste has none", () => {
    expect(normalizeTrainingPrepLinkUrl("  drive.google.com/file/d/abc  ")).toBe(
      "https://drive.google.com/file/d/abc",
    );
  });

  it("leaves http(s) URLs intact", () => {
    expect(normalizeTrainingPrepLinkUrl("https://docs.google.com/x")).toBe(
      "https://docs.google.com/x",
    );
  });
});

describe("validateTrainingPrepLinkUrl", () => {
  it("accepts http(s) and bare host pastes", () => {
    expect(
      validateTrainingPrepLinkUrl("https://drive.google.com/file/d/abc"),
    ).toBeNull();
    expect(validateTrainingPrepLinkUrl("drive.google.com/file/d/abc")).toBeNull();
  });

  it("rejects empty or non-http URLs", () => {
    expect(validateTrainingPrepLinkUrl("")).toMatch(/Paste/);
    expect(validateTrainingPrepLinkUrl("ftp://example.com")).toMatch(/http/);
    expect(validateTrainingPrepLinkUrl("javascript:alert(1)")).toMatch(/http/);
  });
});

describe("nextPrepLinkSortOrder", () => {
  it("steps by 10 after the current max", () => {
    expect(nextPrepLinkSortOrder([])).toBe(10);
    expect(nextPrepLinkSortOrder([{ sort_order: 20 }])).toBe(30);
  });
});
