import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRAINING_PREP_ITEMS,
  TRAINING_PREP_CATEGORIES,
  groupTrainingPrepItems,
  missingDefaultTrainingPrepItems,
  nextPrepSortOrder,
  normalizeTrainingPrepNotes,
  trainingPrepProgress,
  validateTrainingPrepLabel,
} from "./training-prep-checklist";
import type { TrainingPrepItem } from "@/types/database";

function item(
  extra: Partial<TrainingPrepItem> &
    Pick<TrainingPrepItem, "id" | "category" | "label">,
): TrainingPrepItem {
  return {
    program_id: "prog-1",
    item_key: null,
    is_done: false,
    notes: null,
    sort_order: 10,
    ...extra,
  };
}

describe("DEFAULT_TRAINING_PREP_ITEMS", () => {
  it("covers every category with unique keys", () => {
    const keys = DEFAULT_TRAINING_PREP_ITEMS.map((row) => row.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("projector");
    expect(keys).toContain("invitation_letter");

    const categories = new Set(DEFAULT_TRAINING_PREP_ITEMS.map((row) => row.category));
    expect([...categories].sort()).toEqual(
      TRAINING_PREP_CATEGORIES.map((row) => row.id).sort(),
    );
  });

  it("matches the SQL seed rows", () => {
    const sql = readFileSync(
      join(
        __dirname,
        "../supabase/migrations/20260829140000_training_prep_item.sql",
      ),
      "utf8",
    );
    for (const item of DEFAULT_TRAINING_PREP_ITEMS) {
      expect(sql).toContain(
        `('${item.key}', '${item.category}', '${item.label}', ${item.sort_order})`,
      );
    }
  });
});

describe("missingDefaultTrainingPrepItems", () => {
  it("returns the full default list when nothing is present", () => {
    expect(missingDefaultTrainingPrepItems([])).toHaveLength(
      DEFAULT_TRAINING_PREP_ITEMS.length,
    );
    expect(missingDefaultTrainingPrepItems([null, ""])).toHaveLength(
      DEFAULT_TRAINING_PREP_ITEMS.length,
    );
  });

  it("omits keys that already exist", () => {
    const missing = missingDefaultTrainingPrepItems(["projector", "wifi"]);
    expect(missing.map((row) => row.key)).not.toContain("projector");
    expect(missing.map((row) => row.key)).not.toContain("wifi");
    expect(missing).toHaveLength(DEFAULT_TRAINING_PREP_ITEMS.length - 2);
  });
});

describe("trainingPrepProgress", () => {
  it("reports zero when the list is empty", () => {
    expect(trainingPrepProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("rounds the percent of checked items", () => {
    expect(
      trainingPrepProgress([{ is_done: true }, { is_done: false }, { is_done: true }]),
    ).toEqual({ done: 2, total: 3, percent: 67 });
  });
});

describe("groupTrainingPrepItems", () => {
  it("sorts by sort_order then label within each category", () => {
    const grouped = groupTrainingPrepItems([
      item({ id: "b", category: "venue", label: "Zebra", sort_order: 20 }),
      item({ id: "a", category: "venue", label: "Alpha", sort_order: 20 }),
      item({ id: "c", category: "documents", label: "Letter", sort_order: 5 }),
    ]);

    expect(grouped.venue.map((row) => row.id)).toEqual(["a", "b"]);
    expect(grouped.documents.map((row) => row.id)).toEqual(["c"]);
    expect(grouped.hospitality).toEqual([]);
    expect(grouped.day_of).toEqual([]);
  });
});

describe("nextPrepSortOrder", () => {
  it("steps by 10 after the current max", () => {
    expect(nextPrepSortOrder([])).toBe(10);
    expect(nextPrepSortOrder([{ sort_order: 80 }, { sort_order: 40 }])).toBe(90);
  });
});

describe("validateTrainingPrepLabel", () => {
  it("requires a non-empty name", () => {
    expect(validateTrainingPrepLabel("  ")).toMatch(/name/);
    expect(validateTrainingPrepLabel("Projector")).toBeNull();
  });

  it("rejects names that are too long", () => {
    expect(validateTrainingPrepLabel("x".repeat(201))).toMatch(/200/);
  });
});

describe("normalizeTrainingPrepNotes", () => {
  it("stores blank notes as null and trims text", () => {
    expect(normalizeTrainingPrepNotes("  ")).toBeNull();
    expect(normalizeTrainingPrepNotes("  Room 203  ")).toBe("Room 203");
  });
});
