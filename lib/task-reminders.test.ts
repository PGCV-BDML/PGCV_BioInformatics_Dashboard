import { describe, expect, it } from "vitest";
import type { TaskCategory } from "@/types/database";
import {
  comingUpKindLabel,
  comingUpWhenForStart,
  comingUpWhenLabel,
  isComingUpAudience,
  selectComingUpTasks,
  showUpCategoriesOf,
  taskComingUpHref,
  taskComingUpNotificationCopy,
  type ComingUpTaskInput,
} from "./task-reminders";

const NOW = new Date(2026, 8, 7, 15, 4, 0); // Mon 7 Sep 2026, local

function task(
  extra: Partial<ComingUpTaskInput> & Pick<ComingUpTaskInput, "id" | "title">,
): ComingUpTaskInput {
  return {
    start_date: "2026-09-08",
    end_date: "2026-09-08",
    due_date: "2026-09-08",
    task_time: null,
    details: null,
    status: "pending",
    categories: ["tour"],
    linked_analysis_id: null,
    assignee_id: "me",
    assignee_ids: ["me"],
    is_personal: false,
    owner_id: "other",
    ...extra,
  };
}

describe("showUpCategoriesOf", () => {
  it("keeps tour, events, meeting, and training in the task's order", () => {
    expect(
      showUpCategoriesOf([
        "projects",
        "training",
        "meeting",
        "sequence_analysis",
      ]),
    ).toEqual(["training", "meeting"]);
  });
});

describe("comingUpWhenForStart", () => {
  it("maps today and tomorrow, and ignores other days", () => {
    expect(comingUpWhenForStart("2026-09-07", NOW)).toBe("today");
    expect(comingUpWhenForStart("2026-09-08", NOW)).toBe("tomorrow");
    expect(comingUpWhenForStart("2026-09-09", NOW)).toBeNull();
    expect(comingUpWhenForStart("2026-09-06", NOW)).toBeNull();
  });
});

describe("comingUpWhenLabel / comingUpKindLabel", () => {
  it("labels the when chip and collapses duplicate show-up tags", () => {
    expect(comingUpWhenLabel("today")).toBe("Today");
    expect(comingUpWhenLabel("tomorrow")).toBe("Tomorrow");
    expect(comingUpKindLabel(["training", "meeting"])).toBe("Training · Meeting");
    expect(comingUpKindLabel(["tour", "tour"])).toBe("Tour");
  });
});

describe("isComingUpAudience", () => {
  it("includes assignees and personal owners, not unassigned shared tasks", () => {
    expect(isComingUpAudience(task({ id: "a", title: "A" }), "me")).toBe(true);
    expect(isComingUpAudience(task({ id: "b", title: "B" }), "other")).toBe(
      false,
    );
    expect(
      isComingUpAudience(
        task({
          id: "c",
          title: "C",
          assignee_id: null,
          assignee_ids: [],
        }),
        "me",
      ),
    ).toBe(false);
    expect(
      isComingUpAudience(
        task({
          id: "d",
          title: "D",
          assignee_id: null,
          assignee_ids: [],
          is_personal: true,
          owner_id: "me",
        }),
        "me",
      ),
    ).toBe(true);
  });
});

describe("selectComingUpTasks", () => {
  it("includes assigned show-up tasks that start today or tomorrow", () => {
    const result = selectComingUpTasks(
      [
        task({ id: "tomorrow-tour", title: "Campus tour", categories: ["tour"] }),
        task({
          id: "today-meeting",
          title: "Standup",
          start_date: "2026-09-07",
          end_date: "2026-09-07",
          due_date: "2026-09-07",
          task_time: "09:00:00",
          categories: ["meeting"],
          status: "in_progress",
        }),
        task({
          id: "later",
          title: "Too far",
          start_date: "2026-09-09",
          end_date: "2026-09-09",
          due_date: "2026-09-09",
          categories: ["events"],
        }),
      ],
      "me",
      NOW,
    );

    expect(result.map((item) => item.id)).toEqual([
      "today-meeting",
      "tomorrow-tour",
    ]);
    expect(result[0]?.when).toBe("today");
    expect(result[1]?.when).toBe("tomorrow");
  });

  it("emits one card when training and meeting are both tagged", () => {
    const result = selectComingUpTasks(
      [
        task({
          id: "both",
          title: "Prep huddle",
          categories: ["training", "meeting"] as TaskCategory[],
        }),
      ],
      "me",
      NOW,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.showUpCategories).toEqual(["training", "meeting"]);
    expect(comingUpKindLabel(result[0]!.showUpCategories)).toBe(
      "Training · Meeting",
    );
  });

  it("skips linked sequence-analysis tasks even with a meeting tag", () => {
    const result = selectComingUpTasks(
      [
        task({
          id: "analysis",
          title: "WGS — Coral",
          start_date: "2026-09-07",
          end_date: "2026-09-07",
          due_date: "2026-09-07",
          categories: ["sequence_analysis", "meeting"],
          linked_analysis_id: "analysis-1",
        }),
        task({
          id: "analysis-only",
          title: "RNA-seq",
          start_date: "2026-09-07",
          end_date: "2026-09-07",
          due_date: "2026-09-07",
          categories: ["sequence_analysis"],
        }),
      ],
      "me",
      NOW,
    );

    expect(result).toEqual([]);
  });

  it("skips closed, on-hold, and unassigned work", () => {
    const result = selectComingUpTasks(
      [
        task({ id: "done", title: "Done", status: "completed" }),
        task({ id: "off", title: "Off", status: "cancelled" }),
        task({ id: "hold", title: "Hold", status: "on_hold" }),
        task({
          id: "nobody",
          title: "Nobody",
          assignee_id: null,
          assignee_ids: [],
        }),
      ],
      "me",
      NOW,
    );

    expect(result).toEqual([]);
  });

  it("uses the start date, not a multi-day end date", () => {
    const result = selectComingUpTasks(
      [
        task({
          id: "started-yesterday",
          title: "Three-day tour",
          start_date: "2026-09-06",
          end_date: "2026-09-08",
          due_date: "2026-09-08",
          categories: ["tour"],
        }),
      ],
      "me",
      NOW,
    );

    expect(result).toEqual([]);
  });

  it("sorts today before tomorrow, then by clock time", () => {
    const result = selectComingUpTasks(
      [
        task({
          id: "t-late",
          title: "B late",
          start_date: "2026-09-07",
          end_date: "2026-09-07",
          due_date: "2026-09-07",
          task_time: "15:00:00",
          categories: ["meeting"],
        }),
        task({
          id: "t-early",
          title: "A early",
          start_date: "2026-09-07",
          end_date: "2026-09-07",
          due_date: "2026-09-07",
          task_time: "09:00:00",
          categories: ["meeting"],
        }),
        task({
          id: "all-day",
          title: "All day",
          start_date: "2026-09-07",
          end_date: "2026-09-07",
          due_date: "2026-09-07",
          task_time: null,
          categories: ["events"],
        }),
      ],
      "me",
      NOW,
    );

    expect(result.map((item) => item.id)).toEqual([
      "t-early",
      "t-late",
      "all-day",
    ]);
  });

  it("deep-links to the task record", () => {
    const result = selectComingUpTasks(
      [task({ id: "abc", title: "Campus tour" })],
      "me",
      NOW,
    );
    expect(result[0]?.href).toContain("task=abc");
    expect(result[0]?.href).toContain("Campus");
  });
});

describe("taskComingUpNotificationCopy", () => {
  it("builds today/tomorrow lock-screen copy and a task deep link", () => {
    const copy = taskComingUpNotificationCopy(
      {
        task_id: "abc",
        title: "Campus tour",
        start_date: "2026-09-08",
        task_time: "09:00:00",
        categories: ["tour"],
      },
      NOW,
    );
    expect(copy.title).toBe("Tomorrow: Campus tour");
    expect(copy.body).toBe("Tour · 09:00");
    expect(copy.path).toBe(taskComingUpHref({ task_id: "abc", title: "Campus tour" }));
  });
});
