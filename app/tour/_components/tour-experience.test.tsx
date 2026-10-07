import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
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

  it("shows Projects and the Variant tree only when they have content", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Not found", { status: 404 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TourExperience
        content={{
          ...content,
          projects: {
            title: "Research projects",
            intro: "Genomes we assembled",
            items: [
              {
                id: "rusa",
                title: "First draft genome of the Visayan spotted deer",
                species: "Rusa alfredi",
                status: null,
                commonName: null,
                image: null,
                imageFocus: null,
                imageTitle: null,
                imageCredit: null,
                conservation: null,
                facts: [],
                range: null,
                summary: "Summary",
                highlights: [],
                steps: [],
                next: null,
                partners: [],
                citation: null,
              },
            ],
          },
          nextstrain: { title: "Watching the virus change", intro: "Intro", tree: "nextstrain/tree.json" },
        }}
        stats={null}
        phylo={{
          tipCount: 5911,
          firstMonth: "2021-12",
          lastMonth: "2023-09",
          sourceUpdated: "2023-10-26",
          groups: [{ id: "ba2", label: "Omicron BA.2", count: 5911 }],
          provinces: [{ name: "Iloilo", count: 5911 }, { name: "Other", count: 0 }],
        }}
      />,
    );
    expect(screen.getByRole("region", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText("Rusa alfredi")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Variant tree" })).toBeInTheDocument();
    expect(screen.getByText("5,911")).toBeInTheDocument();
    expect(screen.getByText("Dec 2021 – Sep 2023")).toBeInTheDocument();
    // The sections are ordered Projects → COVID-19 → Variant tree.
    const ids = Array.from(document.querySelectorAll("main > section")).map((s) => s.id);
    expect(ids.indexOf("projects")).toBeLessThan(ids.indexOf("covid-19"));
    expect(ids.indexOf("covid-19") + 1).toBe(ids.indexOf("variant-tree"));
    vi.unstubAllGlobals();
  });

  it("puts the 3D virus right after the Variant tree, and hides it without data", () => {
    const virusModel = {
      title: "Meet the virus up close",
      intro: "Turn it around",
      scene: "pgc-covid-exhibit/models/virus-scene.json",
      structure: "pgc-covid-exhibit/models/spike-7KJ2.pdb",
      data: "pgc-covid-exhibit/public-data.json",
    };
    const phylo = {
      tipCount: 10,
      firstMonth: "2022-01",
      lastMonth: "2023-09",
      sourceUpdated: null,
      groups: [],
      provinces: [],
    };
    const { unmount } = render(
      <TourExperience
        content={{ ...content, nextstrain: { title: "Tree", intro: "I", tree: "nextstrain/tree.json" }, virusModel }}
        stats={null}
        phylo={phylo}
        virus={{
          mutations: [
            { name: "D614G", position: 614, region: null, description: "At spike position 614…", firstMonth: "2022-01", count: 5861, chains: ["A", "B", "C"] },
          ],
          sampleCount: 5903,
          coverage: null,
          structure: { id: "7KJ2", url: null, method: null, resolution: null },
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Meet the virus up close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /D614G/ })).toBeInTheDocument();
    const ids = Array.from(document.querySelectorAll("main > section")).map((s) => s.id);
    expect(ids.indexOf("variant-tree") + 1).toBe(ids.indexOf("virus-model"));
    unmount();

    render(<TourExperience content={{ ...content, virusModel }} stats={null} virus={null} />);
    expect(screen.queryByRole("region", { name: "3D virus" })).not.toBeInTheDocument();
  });

  it("puts the lab map after the services and sample results, in a sandboxed frame, and hides it when the page didn't load", () => {
    const labMap = { title: "Explore the lab", intro: "Walk the rooms", src: "lab-map/index.html" };
    const { unmount } = render(<TourExperience content={{ ...content, labMap }} stats={null} labMap />);
    const ids = Array.from(document.querySelectorAll("main > section")).map((s) => s.id);
    expect(ids.slice(0, 4)).toEqual(["welcome", "services", "showcase", "lab-map"]);
    const frame = screen.getByTitle("Explore the lab");
    expect(frame).toHaveAttribute("src", "/api/tour/lab-map");
    expect(frame).toHaveAttribute("sandbox", "allow-scripts");
    unmount();

    render(<TourExperience content={{ ...content, labMap }} stats={null} labMap={false} />);
    expect(screen.queryByRole("region", { name: "Lab map" })).not.toBeInTheDocument();
  });

  it("puts the research agenda right before the team, with partners for technical visitors", async () => {
    const team = {
      ...content.team,
      members: [{ id: "m1", nickname: "Ana", fullName: "Ana Cruz", position: "Analyst", image: null }],
    };
    render(<TourExperience content={{ ...content, team }} stats={null} />);
    const ids = Array.from(document.querySelectorAll("main > section")).map((s) => s.id);
    expect(ids.indexOf("agenda")).toBe(ids.indexOf("team") - 1);

    expect(screen.getByText("Angelwing clam")).toBeInTheDocument();
    expect(screen.queryByText("Aklan State University")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Technical" }));
    expect(screen.getByText("Aklan State University")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evolutionary and population genetics" })).toBeInTheDocument();
  });

  it("hides the Variant tree without a loaded tree", () => {
    render(
      <TourExperience
        content={{ ...content, nextstrain: { title: "T", intro: "I", tree: "nextstrain/tree.json" } }}
        stats={null}
        phylo={null}
      />,
    );
    expect(screen.queryByRole("region", { name: "Variant tree" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Projects" })).not.toBeInTheDocument();
  });
});
