import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enrollablePrograms,
  roleChangeErrorMessage,
  roleChangeImpact,
  roleLockReason,
  updateUserRole,
} from "./access-requests";
import type { TrainingProgram } from "@/types/database";

const { updateCalls, updateResult } = vi.hoisted(() => ({
  updateCalls: [] as unknown[][],
  updateResult: { current: { data: [] as unknown[] | null, error: null as unknown } },
}));

vi.mock("@/lib/supabase", () => {
  const chain = {
    update: (...args: unknown[]) => {
      updateCalls.push(["update", ...args]);
      return chain;
    },
    eq: (...args: unknown[]) => {
      updateCalls.push(["eq", ...args]);
      return chain;
    },
    select: () => Promise.resolve(updateResult.current),
  };
  return { supabase: { from: () => chain } };
});

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

describe("roleLockReason", () => {
  it("locks your own row", () => {
    expect(roleLockReason({ id: "me", role: "team_lead" }, "me", 3)).toBe(
      "Another team lead must change your role",
    );
  });

  it("locks the only team lead", () => {
    expect(roleLockReason({ id: "lead", role: "team_lead" }, "me", 1)).toBe(
      "At least one team lead is required",
    );
  });

  it("leaves other rows editable", () => {
    expect(roleLockReason({ id: "lead", role: "team_lead" }, "me", 2)).toBeNull();
    expect(roleLockReason({ id: "t1", role: "trainee" }, "me", 1)).toBeNull();
  });
});

describe("roleChangeImpact", () => {
  it("explains promoting a learner to staff", () => {
    const lines = roleChangeImpact({
      from: "intern",
      to: "team_member",
      enrollmentCount: 1,
      inTeamDirectory: false,
    });
    expect(lines).toEqual([
      "Gets the full staff dashboard, including projects, sequence analyses, clients and tasks.",
      "Their 1 program enrollment stays. Remove it from the program's Participants page if it's no longer needed.",
      "They won't appear on the Team page until you add them under Manage roster.",
    ]);
  });

  it("skips the roster note when they're already on the Team page", () => {
    const lines = roleChangeImpact({
      from: "none",
      to: "team_member",
      enrollmentCount: 0,
      inTeamDirectory: true,
    });
    expect(lines.some((line) => line.includes("Manage roster"))).toBe(false);
    expect(lines).toContain("Their access request is marked as handled.");
  });

  it("explains demoting a team lead", () => {
    expect(
      roleChangeImpact({
        from: "team_lead",
        to: "team_member",
        enrollmentCount: 0,
        inTeamDirectory: true,
      }),
    ).toEqual([
      "Can no longer assign roles, enroll participants or read the audit log.",
    ]);
  });

  it("explains removing access", () => {
    const lines = roleChangeImpact({
      from: "team_member",
      to: "none",
      enrollmentCount: 0,
      inTeamDirectory: true,
    });
    expect(lines[0]).toMatch(/lose access to the dashboard/);
    expect(lines).toHaveLength(3);
  });

  it("counts several enrollments", () => {
    const lines = roleChangeImpact({
      from: "trainee",
      to: "intern",
      enrollmentCount: 2,
      inTeamDirectory: false,
    });
    expect(lines).toContain(
      "Their 2 program enrollments stay. Remove them from each program's Participants page if they're no longer needed.",
    );
  });
});

describe("updateUserRole", () => {
  beforeEach(() => {
    updateCalls.length = 0;
  });

  it("only updates while the role is still the one shown", async () => {
    updateResult.current = { data: [{ id: "u1" }], error: null };
    await expect(updateUserRole("u1", "trainee", "team_member")).resolves.toBe(
      true,
    );
    expect(updateCalls).toEqual([
      ["update", { role: "team_member" }],
      ["eq", "id", "u1"],
      ["eq", "role", "trainee"],
    ]);
  });

  it("reports a stale row when nothing matched", async () => {
    updateResult.current = { data: [], error: null };
    await expect(updateUserRole("u1", "trainee", "intern")).resolves.toBe(false);
  });

  it("throws database errors", async () => {
    updateResult.current = {
      data: null,
      error: { message: "At least one team lead is required." },
    };
    await expect(updateUserRole("u1", "team_lead", "intern")).rejects.toEqual({
      message: "At least one team lead is required.",
    });
  });
});

describe("roleChangeErrorMessage", () => {
  it("passes the guard trigger's messages through", () => {
    expect(
      roleChangeErrorMessage({
        message:
          "You can't change your own role. Ask another team lead to do it.",
      }),
    ).toBe("You can't change your own role. Ask another team lead to do it.");
    expect(
      roleChangeErrorMessage({
        message:
          "At least one team lead is required. Make someone else a team lead first.",
      }),
    ).toBe(
      "At least one team lead is required. Make someone else a team lead first.",
    );
  });

  it("rewords the team-lead-only rule", () => {
    expect(
      roleChangeErrorMessage({
        message: "Only team_lead can modify the role column",
      }),
    ).toBe("Only team leads can change roles.");
  });

  it("falls back to a generic message", () => {
    expect(roleChangeErrorMessage(new Error("network down"))).toBe(
      "Couldn't change the role. Please try again.",
    );
    expect(roleChangeErrorMessage(null)).toBe(
      "Couldn't change the role. Please try again.",
    );
  });
});
