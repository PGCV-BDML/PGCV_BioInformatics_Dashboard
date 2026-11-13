import { describe, expect, it } from "vitest";
import { sortPrograms } from "./program-order";
import type { TrainingProgramStatus } from "@/types/database";

function program(
  title: string,
  status: TrainingProgramStatus,
  start_date = "",
  pinned_at = "",
) {
  return { title, status, start_date, pinned_at };
}

const titles = (list: { title: string }[]) => list.map((p) => p.title);

describe("sortPrograms", () => {
  it("lists pinned programs first, most recently pinned on top", () => {
    const sorted = sortPrograms([
      program("Ongoing", "ongoing", "2026-11-01"),
      program("Old pin", "completed", "2026-01-01", "2026-11-01T00:00:00Z"),
      program("New pin", "archived", "2025-01-01", "2026-11-13T02:00:00.123456+00:00"),
    ]);
    expect(titles(sorted)).toEqual(["New pin", "Old pin", "Ongoing"]);
  });

  it("orders the rest by status, then start date", () => {
    const sorted = sortPrograms([
      program("Archived", "archived", "2026-10-01"),
      program("Completed older", "completed", "2026-06-16"),
      program("Upcoming later", "draft", "2027-01-10"),
      program("Completed newer", "completed", "2026-10-27"),
      program("Upcoming sooner", "draft", "2026-11-25"),
      program("Ongoing", "ongoing", "2026-11-01"),
    ]);
    expect(titles(sorted)).toEqual([
      "Ongoing",
      "Upcoming sooner",
      "Upcoming later",
      "Completed newer",
      "Completed older",
      "Archived",
    ]);
  });

  it("puts undated programs last in their group, then sorts by title", () => {
    const sorted = sortPrograms([
      program("B undated", "ongoing"),
      program("A undated", "ongoing"),
      program("Dated", "ongoing", "2026-11-01"),
    ]);
    expect(titles(sorted)).toEqual(["Dated", "A undated", "B undated"]);
  });

  it("does not change the list it was given", () => {
    const list = [program("B", "ongoing"), program("A", "ongoing")];
    sortPrograms(list);
    expect(titles(list)).toEqual(["B", "A"]);
  });
});
