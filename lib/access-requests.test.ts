import { describe, expect, it } from "vitest";
import { enrollablePrograms } from "./access-requests";
import type { TrainingProgram } from "@/types/database";

function program(
  id: string,
  title: string,
  type: TrainingProgram["type"],
  status: TrainingProgram["status"],
): TrainingProgram {
  return {
    id,
    title,
    type,
    status,
    start_date: null,
    end_date: null,
    instructor_id: "lead-1",
    description: null,
    requesting_institution: null,
    training_code: null,
  };
}

const programs = [
  program("t2", "Metagenomics", "training", "ongoing"),
  program("t1", "Intro to Bioinformatics", "training", "draft"),
  program("t3", "Old Workshop", "training", "completed"),
  program("i1", "Summer Internship", "internship", "ongoing"),
  program("i2", "Archived Internship", "internship", "archived"),
];

describe("enrollablePrograms", () => {
  it("lists open trainings for trainees, sorted by title", () => {
    expect(enrollablePrograms(programs, "trainee").map((p) => p.id)).toEqual([
      "t1",
      "t2",
    ]);
  });

  it("lists open internships for interns", () => {
    expect(enrollablePrograms(programs, "intern").map((p) => p.id)).toEqual([
      "i1",
    ]);
  });

  it("has nothing to enroll staff or officers in", () => {
    expect(enrollablePrograms(programs, "team_member")).toEqual([]);
    expect(enrollablePrograms(programs, "reviewing_officer")).toEqual([]);
  });
});
