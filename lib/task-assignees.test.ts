import { describe, expect, it } from "vitest";
import type { Task } from "@/types/database";
import {
  applyTaskAssignees,
  formatAssigneeNames,
  primaryAssigneeId,
  resolveTaskAssigneeIds,
} from "./task-assignees";
import { buildTaskRecordPayload } from "./task-payload";

const baseTask = {
  title: "Review assemblies",
  start_date: "2026-08-19",
  end_date: "2026-08-19",
  due_date: "2026-08-19",
  details: null,
  status: "pending" as const,
  priority: "medium" as const,
  linked_project_id: null,
};

describe("resolveTaskAssigneeIds", () => {
  it("uses the junction list, including empty for unassigned", () => {
    expect(resolveTaskAssigneeIds({ assignee_id: "u1", assignee_ids: [] })).toEqual(
      [],
    );
    expect(
      resolveTaskAssigneeIds({ assignee_id: "u1", assignee_ids: ["u2", "u3"] }),
    ).toEqual(["u2", "u3"]);
  });

  it("falls back to assignee_id when the list is omitted", () => {
    expect(resolveTaskAssigneeIds({ assignee_id: "u1" })).toEqual(["u1"]);
    expect(resolveTaskAssigneeIds({ assignee_id: null })).toEqual([]);
  });
});

describe("formatAssigneeNames", () => {
  const names = new Map([
    ["u1", "Ada"],
    ["u2", "Grace"],
  ]);

  it("joins names and labels an empty list as Unassigned", () => {
    expect(formatAssigneeNames([], names)).toBe("Unassigned");
    expect(formatAssigneeNames(["u1", "u2"], names)).toBe("Ada, Grace");
  });
});

describe("applyTaskAssignees", () => {
  it("prefers junction rows over the denormalized column", () => {
    const tasks: Task[] = [
      {
        id: "t1",
        ...baseTask,
        assignee_id: "u1",
      },
    ];
    const enriched = applyTaskAssignees(
      tasks,
      new Map([["t1", ["u2", "u1"]]]),
    );
    expect(enriched[0]?.assignee_ids).toEqual(["u2", "u1"]);
    expect(enriched[0]?.assignee_id).toBe("u2");
  });
});

describe("buildTaskRecordPayload", () => {
  it("stores the first assignee and allows unassigned", () => {
    const assigned = buildTaskRecordPayload({
      ...baseTask,
      assignee_id: null,
      assignee_ids: ["u2", "u1"],
      categories: ["meeting"],
    });
    expect(assigned.assignee_id).toBe("u2");

    const unassigned = buildTaskRecordPayload({
      ...baseTask,
      assignee_id: "stale",
      assignee_ids: [],
      categories: ["meeting"],
    });
    expect(unassigned.assignee_id).toBeNull();
  });

  it("never marks a task personal from the form", () => {
    const payload = buildTaskRecordPayload({
      ...baseTask,
      assignee_id: null,
      assignee_ids: ["u1"],
      categories: ["meeting"],
      is_personal: true,
    });
    expect(payload.is_personal).toBe(false);
  });
});

describe("primaryAssigneeId", () => {
  it("returns null when nobody is assigned", () => {
    expect(primaryAssigneeId([])).toBeNull();
    expect(primaryAssigneeId(["u1"])).toBe("u1");
  });
});
