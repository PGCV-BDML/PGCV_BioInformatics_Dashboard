import { describe, expect, it } from "vitest";
import type { Task } from "@/types/database";
import {
  eachDateKeyInRange,
  filterByCategory,
  formatTaskDateRange,
  getMonthGrid,
  mapTasksForCalendar,
  normalizeDueDate,
  normalizeTaskDateRange,
  taskHref,
  taskOverlapsRange,
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

describe("normalizeTaskDateRange", () => {
  it("defaults end date to start when end is omitted", () => {
    expect(normalizeTaskDateRange("2026-08-04", "")).toEqual({
      start_date: "2026-08-04",
      end_date: "2026-08-04",
      due_date: "2026-08-04",
    });
  });

  it("keeps an explicit end date", () => {
    expect(normalizeTaskDateRange("2026-08-04", "2026-08-08")).toEqual({
      start_date: "2026-08-04",
      end_date: "2026-08-08",
      due_date: "2026-08-08",
    });
  });

  it("ignores an end date before start", () => {
    expect(normalizeTaskDateRange("2026-08-08", "2026-08-04")).toEqual({
      start_date: "2026-08-08",
      end_date: "2026-08-08",
      due_date: "2026-08-08",
    });
  });
});

describe("eachDateKeyInRange", () => {
  it("returns inclusive keys", () => {
    expect(eachDateKeyInRange("2026-08-04", "2026-08-06")).toEqual([
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
    ]);
  });
});

describe("taskOverlapsRange", () => {
  it("detects overlap with a window", () => {
    expect(
      taskOverlapsRange("2026-08-04", "2026-08-08", "2026-08-01", "2026-08-05"),
    ).toBe(true);
    expect(
      taskOverlapsRange("2026-08-10", "2026-08-12", "2026-08-01", "2026-08-05"),
    ).toBe(false);
  });
});

describe("formatTaskDateRange", () => {
  it("shows a single date when start equals end", () => {
    expect(
      formatTaskDateRange({
        start_date: "2026-08-04",
        end_date: "2026-08-04",
      }),
    ).toBe("08/04/2026");
  });

  it("shows a range when dates differ", () => {
    expect(
      formatTaskDateRange({
        start_date: "2026-08-04",
        end_date: "2026-08-08",
      }),
    ).toBe("08/04/2026 – 08/08/2026");
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
  it("keeps only tasks with dates and resolves names", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "With due",
        assignee_id: "u1",
        start_date: "2026-07-28",
        end_date: "2026-07-30",
        due_date: "2026-07-30",
        status: "pending",
        priority: "high",
        linked_project_id: "p1",
      },
      {
        id: "2",
        title: "No due",
        assignee_id: "u1",
        start_date: null,
        end_date: null,
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
      start_date: "2026-07-28",
      end_date: "2026-07-30",
      projectName: "Project A",
      assigneeName: "Ada",
    });
  });
});

describe("upcomingTasks", () => {
  it("returns non-completed tasks within the window, sorted by start date", () => {
    const todayKey = toDateKey(new Date());
    const tasks: Parameters<typeof upcomingTasks>[0] = [
      {
        id: "a",
        title: "Later",
        start_date: "2099-01-15",
        end_date: "2099-01-15",
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
        start_date: todayKey,
        end_date: todayKey,
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
        start_date: todayKey,
        end_date: todayKey,
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

  it("includes multi-day tasks that overlap the window", () => {
    const todayKey = toDateKey(new Date());
    const tasks: Parameters<typeof upcomingTasks>[0] = [
      {
        id: "span",
        title: "Conference",
        start_date: todayKey,
        end_date: "2099-01-20",
        status: "pending",
        priority: "medium",
        assignee_id: "u",
        linked_project_id: "p",
        categories: ["events"],
        projectName: "P",
        assigneeName: "U",
      },
    ];

    expect(upcomingTasks(tasks, { limit: 5, daysAhead: 7 })).toHaveLength(1);
  });
});

describe("filterByCategory", () => {
  it("keeps tasks that include the selected category", () => {
    const tasks = [
      {
        id: "1",
        title: "A",
        start_date: "2026-07-28",
        end_date: "2026-07-28",
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
        start_date: "2026-07-29",
        end_date: "2026-07-29",
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
