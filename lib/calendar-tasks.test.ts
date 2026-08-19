import { describe, expect, it } from "vitest";
import type { Task } from "@/types/database";
import {
  buildTasksByDate,
  eachDateKeyInRange,
  endOfWeek,
  filterByCategory,
  formatTaskDateRange,
  formatTaskTimeForInput,
  getMonthGrid,
  mapTasksForCalendar,
  MAX_CELL_ENTRIES,
  normalizeDueDate,
  normalizeTaskDateRange,
  normalizeTaskTime,
  splitCellPreview,
  startOfWeek,
  STATUS_LABELS,
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

describe("startOfWeek / endOfWeek", () => {
  it("uses Sunday through Saturday for the current week", () => {
    const monday = new Date(2026, 7, 10); // Mon Aug 10, 2026
    expect(toDateKey(startOfWeek(monday))).toBe("2026-08-09");
    expect(toDateKey(endOfWeek(monday))).toBe("2026-08-15");
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

  it("appends an optional time when present", () => {
    expect(
      formatTaskDateRange({
        start_date: "2026-08-04",
        end_date: "2026-08-04",
        task_time: "14:30:00",
      }),
    ).toBe("08/04/2026 · 14:30");
  });
});

describe("normalizeTaskTime", () => {
  it("persists HH:MM as HH:MM:SS", () => {
    expect(normalizeTaskTime("09:15")).toBe("09:15:00");
  });

  it("returns null when empty", () => {
    expect(normalizeTaskTime("")).toBeNull();
    expect(normalizeTaskTime(null)).toBeNull();
  });
});

describe("formatTaskTimeForInput", () => {
  it("strips seconds for the time input", () => {
    expect(formatTaskTimeForInput("14:30:00")).toBe("14:30");
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
        task_time: "09:00:00",
        details: null,
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
        details: null,
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
      task_time: "09:00:00",
      projectName: "Project A",
      assigneeName: "Ada",
    });
  });

  it("joins multiple assignee names and labels an empty list Unassigned", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "Shared",
        assignee_id: "u1",
        assignee_ids: ["u1", "u2"],
        start_date: "2026-07-28",
        end_date: "2026-07-28",
        due_date: "2026-07-28",
        details: null,
        status: "pending",
        priority: "medium",
        linked_project_id: null,
      },
      {
        id: "2",
        title: "Open",
        assignee_id: null,
        assignee_ids: [],
        start_date: "2026-07-29",
        end_date: "2026-07-29",
        due_date: "2026-07-29",
        details: null,
        status: "pending",
        priority: "low",
        linked_project_id: null,
      },
    ];

    const mapped = mapTasksForCalendar(
      tasks,
      new Map(),
      new Map([
        ["u1", "Ada"],
        ["u2", "Grace"],
      ]),
    );

    expect(mapped.map((t) => t.assigneeName)).toEqual(["Ada, Grace", "Unassigned"]);
  });
});

describe("buildTasksByDate", () => {
  it("orders same-day tasks by time then title", () => {
    const tasks: Parameters<typeof upcomingTasks>[0] = [
      {
        id: "late",
        title: "Later",
        start_date: "2026-08-04",
        end_date: "2026-08-04",
        task_time: "15:00:00",
        details: null,
        status: "pending",
        priority: "low",
        assignee_id: "u",
        linked_project_id: "p",
        categories: [],
        projectName: "P",
        assigneeName: "U",
      },
      {
        id: "early",
        title: "Earlier",
        start_date: "2026-08-04",
        end_date: "2026-08-04",
        task_time: "09:00:00",
        details: null,
        status: "pending",
        priority: "high",
        assignee_id: "u",
        linked_project_id: "p",
        categories: [],
        projectName: "P",
        assigneeName: "U",
      },
    ];
    expect(buildTasksByDate(tasks).get("2026-08-04")?.map((t) => t.id)).toEqual([
      "early",
      "late",
    ]);
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
        details: null,
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
        details: null,
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
        details: null,
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
        details: "Manila conference center",
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

  it("omits cancelled tasks from the upcoming list", () => {
    const todayKey = toDateKey(new Date());
    const tasks: Parameters<typeof upcomingTasks>[0] = [
      {
        id: "open",
        title: "Still on",
        start_date: todayKey,
        end_date: todayKey,
        details: null,
        status: "pending",
        priority: "medium",
        assignee_id: "u",
        linked_project_id: "p",
        categories: [],
        projectName: "P",
        assigneeName: "U",
      },
      {
        id: "off",
        title: "Called off",
        start_date: todayKey,
        end_date: todayKey,
        details: null,
        status: "cancelled",
        priority: "low",
        assignee_id: "u",
        linked_project_id: "p",
        categories: [],
        projectName: "P",
        assigneeName: "U",
      },
    ];

    expect(upcomingTasks(tasks, { limit: 5, daysAhead: 0 }).map((t) => t.id)).toEqual(
      ["open"],
    );
  });
});

describe("STATUS_LABELS", () => {
  it("includes Cancelled", () => {
    expect(STATUS_LABELS.cancelled).toBe("Cancelled");
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
        details: null,
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
        details: null,
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

describe("splitCellPreview", () => {
  it("shows everything when the day fits", () => {
    expect(splitCellPreview(1, 2)).toEqual({ absences: 1, tasks: 2 });
  });

  it("leaves room for two tasks when a day is crowded with absences", () => {
    expect(splitCellPreview(5, 3)).toEqual({ absences: 2, tasks: 2 });
  });

  it("hands unused task slots back to absences", () => {
    expect(splitCellPreview(5, 1)).toEqual({ absences: 3, tasks: 1 });
  });

  it("gives every slot to tasks when nobody is out", () => {
    expect(splitCellPreview(0, 9)).toEqual({ absences: 0, tasks: 4 });
  });

  it("gives every slot to absences when there are no tasks", () => {
    expect(splitCellPreview(9, 0)).toEqual({ absences: 4, tasks: 0 });
  });

  it("never previews more entries than the cap", () => {
    for (let absences = 0; absences <= 8; absences += 1) {
      for (let tasks = 0; tasks <= 8; tasks += 1) {
        const split = splitCellPreview(absences, tasks);
        expect(split.absences + split.tasks).toBeLessThanOrEqual(
          MAX_CELL_ENTRIES,
        );
        expect(split.absences).toBeLessThanOrEqual(absences);
        expect(split.tasks).toBeLessThanOrEqual(tasks);
      }
    }
  });

  it("fills every slot whenever the day has enough entries", () => {
    for (let absences = 0; absences <= 8; absences += 1) {
      for (let tasks = 0; tasks <= 8; tasks += 1) {
        const split = splitCellPreview(absences, tasks);
        const shown = split.absences + split.tasks;
        const expected = Math.min(absences + tasks, MAX_CELL_ENTRIES);
        expect(shown).toBe(expected);
      }
    }
  });

  it("never reports a negative hidden count", () => {
    const split = splitCellPreview(0, 0);
    expect(split).toEqual({ absences: 0, tasks: 0 });
  });
});

describe("taskHref", () => {
  it("links to the tasks page with task id and search", () => {
    expect(taskHref({ id: "abc", title: "Fix pipeline" })).toBe(
      "/dashboard/tasks?task=abc&search=Fix+pipeline",
    );
  });
});
