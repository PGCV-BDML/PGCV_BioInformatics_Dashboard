import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { FALLBACK_TOUR, type TourContent } from "@/lib/tour";
import { TourExperience } from "./tour-experience";

beforeAll(() => {
  // jsdom has neither of these.
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
  Element.prototype.scrollIntoView = () => {};
});

const content: TourContent = {
  ...FALLBACK_TOUR,
  hero: {
    ...FALLBACK_TOUR.hero,
    intro: { general: "General intro", students: "Students intro", technical: "Technical intro" },
  },
};

describe("TourExperience", () => {
  it("switches copy when a different audience is picked", async () => {
    render(<TourExperience content={content} stats={null} />);
    expect(screen.getByText("General intro")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Students" }));
    expect(screen.getByText("Students intro")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Students" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("radio", { name: "Technical" }));
    expect(screen.getByText("Technical intro")).toBeInTheDocument();
  });

  it("hides sections with nothing to show and omits COVID numbers without stats", () => {
    render(<TourExperience content={content} stats={null} />);
    // Fallback content has no trainings, team or videos.
    expect(screen.queryByRole("region", { name: "Team" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Videos" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "COVID-19" })).toBeInTheDocument();
    expect(screen.queryByText("samples sequenced")).not.toBeInTheDocument();
  });

  it("shows aggregate COVID numbers when stats are available", () => {
    render(
      <TourExperience
        content={content}
        stats={{
          totalRuns: 85,
          totalSamples: 4812,
          lineageAssigned: 4500,
          pctLineageAssigned: 93.5,
          firstRunDate: "2022-01-27",
          lastRunDate: "2023-06-30",
          quarterly: [{ label: "Q1 2022", samples: 400 }],
        }}
      />,
    );
    expect(screen.getByText("4,812")).toBeInTheDocument();
    expect(screen.getByText("93.5%")).toBeInTheDocument();
    expect(screen.getByText(/Samples sequenced per quarter/)).toBeInTheDocument();
  });
});
