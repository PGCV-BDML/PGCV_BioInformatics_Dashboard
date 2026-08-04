import { describe, expect, it } from "vitest";
import type { Task } from "@/types/database";
import {
  filterByCategory,
  getMonthGrid,
  mapTasksForCalendar,
  normalizeDueDate,
  taskHref,
  toDateKey,
  upcomingTasks,
} from "./calendar-tasks";

describe("toDateKey", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toDateKey(new Date(2026, 6, 27))).toBe("2026-07-27");
  });
});

describe("normalizeDueDate", () => {
  it("keeps YYYY-MM-DD values", () => {
    expect(normalizeDueDate("2026-08-04")).toBe("2026-08-04");
  });

  it("strips time from ISO timestamps", () => {
    expect(normalizeDueDate("2026-08-04T00:00:00.000Z")).toBe("2026-08-04");
  });

  it("returns null for empty values", () => {
    expect(normalizeDueDate("")).toBeNull();
    expect(normalizeDueDate(null)).toBeNull();
  });
});

describe("getMonthGrid", () => {
  it("returns 42 cells starting on Sunday", () => {
    const grid = getMonthGrid(new Date(2026, 6, 1)); // July 2026
    expect(grid).toHaveLength(42);
    expect(grid[0]!.getDay()).toBe(0);
  });
});

describe("mapTasksForCalendar", () => {
  it("keeps only tasks with due dates and resolves names", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "With due",
        assignee_id: "u1",
        due_date: "2026-07-28",
        status: "pending",
        priority: "high",
        linked_project_id: "p1",
      },
      {
        id: "2",
        title: "No due",
        assignee_id: "u1",
        due_date: null,
        status: "pending",
        priority: "low",
        linked_project_id: "p1",
      },
    ];

    const mapped = mapTasksForCalendar(
      tasks,
      new Map([["p1", "Project A"]]),
      new Map([["u1", "Ada"]]),
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      id: "1",
      projectName: "Project A",
      assigneeName: "Ada",
    });
  });
});

describe("upcomingTasks", () => {
  it("returns non-completed tasks within the window, sorted by due date", () => {
    const todayKey = toDateKey(new Date());
    const tasks: Parameters<typeof upcomingTasks>[0] = [
      {
        id: "a",
        title: "Later",
        due_date: "2099-01-15",
        status: "pending",
        priority: "low",
        assignee_id: "u",
        linked_project_id: "p",
        categories: [],
        projectName: "P",
        assigneeName: "U",
      },
      {
        id: "b",
        title: "Soon",
        due_date: todayKey,
        status: "pending",
        priority: "high",
        assignee_id: "u",
        linked_project_id: "p",
        categories: ["sequence_analysis"],
        projectName: "P",
        assigneeName: "U",
      },
      {
        id: "c",
        title: "Done",
        due_date: todayKey,
        status: "completed",
        priority: "high",
        assignee_id: "u",
        linked_project_id: "p",
        categories: [],
        projectName: "P",
        assigneeName: "U",
      },
    ];

    const result = upcomingTasks(tasks, { limit: 5, daysAhead: 0 });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("filterByCategory", () => {
  it("keeps tasks that include the selected category", () => {
    const tasks = [
      {
        id: "1",
        title: "A",
        due_date: "2026-07-28",
        status: "pending" as const,
        priority: "high" as const,
        assignee_id: "u",
        linked_project_id: "p",
        categories: ["sequence_analysis" as const],
        projectName: "P",
        assigneeName: "U",
      },
      {
        id: "2",
        title: "B",
        due_date: "2026-07-29",
        status: "pending" as const,
        priority: "low" as const,
        assignee_id: "u",
        linked_project_id: "p",
        categories: ["meeting" as const],
        projectName: "P",
        assigneeName: "U",
      },
    ];
    expect(filterByCategory(tasks, "sequence_analysis").map((t) => t.id)).toEqual([
      "1",
    ]);
    expect(filterByCategory(tasks, "All")).toHaveLength(2);
  });
});

describe("taskHref", () => {
  it("links to the tasks page with task id and search", () => {
    expect(taskHref({ id: "abc", title: "Fix pipeline" })).toBe(
      "/dashboard/tasks?task=abc&search=Fix+pipeline",
    );
  });
});
