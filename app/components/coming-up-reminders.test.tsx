import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComingUpList } from "./coming-up-reminders";
import type { ComingUpReminder } from "@/lib/task-reminders";

const tourTomorrow: ComingUpReminder = {
  id: "t1",
  title: "Campus tour",
  start_date: "2026-09-08",
  task_time: "09:00:00",
  details: "Meet at the lobby.",
  categories: ["tour"],
  showUpCategories: ["tour"],
  when: "tomorrow",
  dateLabel: "09/08/2026 · 09:00",
  href: "/dashboard/tasks?task=t1&search=Campus+tour",
};

const meetingToday: ComingUpReminder = {
  id: "t2",
  title: "Prep huddle",
  start_date: "2026-09-07",
  task_time: null,
  details: null,
  categories: ["training", "meeting"],
  showUpCategories: ["training", "meeting"],
  when: "today",
  dateLabel: "09/07/2026",
  href: "/dashboard/tasks?task=t2&search=Prep+huddle",
};

describe("ComingUpList", () => {
  it("shows today and tomorrow cards with a task link", () => {
    render(
      <ComingUpList
        items={[meetingToday, tourTomorrow]}
        isLoading={false}
        error={null}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Coming up" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Campus tour")).toBeInTheDocument();
    expect(screen.getByText("Prep huddle")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("09/07/2026")).toBeInTheDocument();
    expect(screen.getByText("09/08/2026 · 09:00")).toBeInTheDocument();
    expect(screen.getByText("Training")).toBeInTheDocument();
    expect(screen.getByText("Meeting")).toBeInTheDocument();
    const taskLinks = screen.getAllByRole("link", { name: /open task/i });
    expect(taskLinks[0]).toHaveAttribute("href", meetingToday.href);
    expect(taskLinks[1]).toHaveAttribute("href", tourTomorrow.href);
  });

  it("explains when nothing is due in the next two days", () => {
    render(<ComingUpList items={[]} isLoading={false} error={null} />);
    expect(
      screen.getByText(
        "No tours, events, meetings, or training today or tomorrow.",
      ),
    ).toBeInTheDocument();
  });
});
