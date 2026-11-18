import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FALLBACK_TOUR } from "@/lib/tour";
import { LogoHelix } from "./logo-helix";
import { SectionBackdrop } from "./section-backdrop";
import { hasServiceIcon, ServiceIcon } from "./service-icons";

describe("ServiceIcon", () => {
  it("has a drawn icon for every built-in service", () => {
    for (const service of FALLBACK_TOUR.services.items) {
      expect(hasServiceIcon(service.id), service.id).toBe(true);
    }
  });

  it("draws the icon for a known service", () => {
    const { container } = render(<ServiceIcon id="dna-barcoding" code="BC" color="#912a8c" />);
    expect(container.querySelector("[data-service-icon=dna-barcoding] svg")).not.toBeNull();
    expect(container.textContent).toBe("");
  });

  it("falls back to the service code for an unknown id", () => {
    const { container } = render(<ServiceIcon id="proteomics" code="PR" color="#2b3278" />);
    expect(container.querySelector("[data-service-icon=fallback]")?.textContent).toBe("PR");
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("LogoHelix", () => {
  it("gives each instance its own gradient ids", () => {
    const { container } = render(
      <>
        <LogoHelix />
        <LogoHelix onDark />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    for (const path of container.querySelectorAll("path, line")) {
      const ref = path.getAttribute("stroke")?.match(/^url\(#(.+)\)$/)?.[1];
      expect(ids).toContain(ref);
    }
  });
});

describe("SectionBackdrop", () => {
  it("keeps the sequence texture out of the page text", () => {
    const { container } = render(<SectionBackdrop variant="hero" />);
    const rows = [...container.querySelectorAll("[data-seq]")].map((row) => row.getAttribute("data-seq") ?? "");
    expect(container.textContent).toBe("");
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toMatch(/^[ACGT]+$/);
      // All four bases appear, so the rows don't collapse into a repeating pattern.
      expect(new Set(row).size).toBe(4);
    }
    expect(new Set(rows).size).toBe(rows.length);
  });
});

describe("the dark slides' backdrop", () => {
  it.each(["hero", "contact"] as const)("draws the %s aurora as hidden decoration with no text", (variant) => {
    const { container } = render(<SectionBackdrop variant={variant} />);
    const root = container.firstElementChild!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.childElementCount).toBeGreaterThan(2);
    expect(container.textContent).toBe("");
  });
});

describe("the project slides", () => {
  it("tell the deer example's story, then its range, timeline and a scannable citation", async () => {
    const { parseTourContent } = await import("@/lib/tour");
    const { ProjectJourney, ProjectStory, hasProjectJourney } = await import("./project-feature");
    const deerExample = (await import("@/docs/tour-content/visayan-spotted-deer.json")).default;
    const tour = parseTourContent({ version: 1, ...FALLBACK_TOUR, projects: deerExample });
    const deer = tour.projects.items[0]!;
    expect(hasProjectJourney(deer)).toBe(true);

    const story = render(<ProjectStory project={deer} audience="students" />);
    expect(story.getByText(/giant puzzle/)).toBeInTheDocument();
    expect(story.getByText("Meet Abraham")).toBeInTheDocument();
    story.unmount();

    const { getByText, getByRole, getAllByText } = render(<ProjectJourney project={deer} audience="students" />);
    expect(getByText("Cebu").closest("li")).toHaveTextContent("Formerly Cebu");
    expect(getAllByText(/\(done\)/)).toHaveLength(5);
    expect(getByRole("img", { name: /QR code linking to Javier et al\. \(2025\)/ }).querySelector("path")).not.toBeNull();
    expect(getByRole("link", { name: /Javier et al\. \(2025\), GigaByte/ })).toHaveAttribute(
      "href",
      "https://doi.org/10.46471/gigabyte.150",
    );
  });

  it("leave out the second slide when a project has nothing for it", async () => {
    const { hasProjectJourney } = await import("./project-feature");
    const bare = {
      id: "p",
      title: "A genome",
      species: null,
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
    };
    expect(hasProjectJourney(bare)).toBe(false);
    expect(hasProjectJourney({ ...bare, next: "More sequencing" })).toBe(true);
  });
});

describe("scientific names", () => {
  it("sets them in italics in the deer project's technical summary", async () => {
    const { parseTourContent } = await import("@/lib/tour");
    const { ProjectJourney, ProjectStory } = await import("./project-feature");
    const deerExample = (await import("@/docs/tour-content/visayan-spotted-deer.json")).default;
    const tour = parseTourContent({ version: 1, ...FALLBACK_TOUR, projects: deerExample });
    const { container } = render(
      <>
        <ProjectStory project={tour.projects.items[0]!} audience="technical" />
        <ProjectJourney project={tour.projects.items[0]!} audience="technical" />
      </>,
    );
    const italics = [...container.querySelectorAll("i")].map((i) => i.textContent);
    expect(italics).toEqual(["Cervus elaphus", "R. alfredi", "Cervus"]);
    expect(container.textContent).not.toContain("*");
  });

  it("sets them in italics on the research agenda cards", async () => {
    const { AGENDA } = await import("@/lib/tour-agenda");
    const { AgendaAreaCard } = await import("./research-agenda");
    const { container } = render(
      <>
        {AGENDA.map((area) => (
          <AgendaAreaCard key={area.id} area={area} audience="technical" />
        ))}
      </>,
    );
    const italics = [...container.querySelectorAll("i")].map((i) => i.textContent);
    expect(italics).toEqual(["Rusa alfredi", "Rusa alfredi", "Pholas orientalis", "Macrobrachium"]);
    expect(container.textContent).not.toContain("*");
  });
});
