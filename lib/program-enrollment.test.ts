import { describe, expect, it } from "vitest";
import {
  countListedParticipantsByProgram,
  isListedParticipant,
} from "./program-enrollment";

const learners = new Set(["trainee-1", "intern-1"]);

describe("isListedParticipant", () => {
  it("includes enrolled and completed trainees and interns", () => {
    expect(isListedParticipant("enrolled", "trainee-1", learners)).toBe(true);
    expect(isListedParticipant("completed", "intern-1", learners)).toBe(true);
  });

  it("excludes dropped enrollments and people who are no longer learners", () => {
    expect(isListedParticipant("dropped", "trainee-1", learners)).toBe(false);
    expect(isListedParticipant("enrolled", "staff-1", learners)).toBe(false);
  });
});

describe("countListedParticipantsByProgram", () => {
  it("counts only listed participants for each program", () => {
    const counts = countListedParticipantsByProgram(
      [
        { program_id: "16s", user_id: "trainee-1", status: "enrolled" },
        { program_id: "16s", user_id: "intern-1", status: "completed" },
        { program_id: "16s", user_id: "trainee-1", status: "dropped" },
        { program_id: "16s", user_id: "staff-1", status: "enrolled" },
        { program_id: "intro", user_id: "trainee-1", status: "enrolled" },
      ],
      learners,
    );

    expect(counts.get("16s")).toBe(2);
    expect(counts.get("intro")).toBe(1);
  });
});
