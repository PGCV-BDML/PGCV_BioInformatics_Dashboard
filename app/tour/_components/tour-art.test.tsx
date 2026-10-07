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

describe("light section motifs", () => {
  it.each(["assembly", "network", "contours", "radar", "bokeh", "glyphs"] as const)(
    "draws the %s art as hidden decoration with no text",
    (motif) => {
      const { container } = render(<SectionBackdrop variant="light" motif={motif} />);
      const root = container.firstElementChild!;
      expect(root.getAttribute("aria-hidden")).toBe("true");
      expect(root.childElementCount).toBeGreaterThan(2);
      expect(container.textContent).toBe("");
    },
  );

  it("draws the field symbols as generated content", () => {
    const { container } = render(<SectionBackdrop variant="light" motif="glyphs" />);
    const symbols = [...container.querySelectorAll("[data-glyph]")].map((g) => g.getAttribute("data-glyph"));
    expect(symbols).toContain("Σ");
    expect(symbols).toContain("</>");
    expect(symbols).toContain("ATG");
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("points the radar sweep at its own gradient", () => {
    const { container } = render(<SectionBackdrop variant="light" motif="radar" />);
    const id = container.querySelector("linearGradient")?.id;
    expect(id).toBeTruthy();
    expect(container.querySelector(`path[fill="url(#${id})"]`)).not.toBeNull();
  });

  it("leaves a plain light section without extra art", () => {
    const { container } = render(<SectionBackdrop variant="light" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("FeaturedProject", () => {
  it("renders the deer example with its range, timeline and a scannable citation", async () => {
    const { parseTourContent } = await import("@/lib/tour");
    const { FeaturedProject } = await import("./project-feature");
    const deerExample = (await import("@/docs/tour-content/visayan-spotted-deer.json")).default;
    const tour = parseTourContent({ version: 1, ...FALLBACK_TOUR, projects: deerExample });
    const { getByText, getByRole, getAllByText } = render(
      <FeaturedProject project={tour.projects.items[0]!} audience="students" />,
    );
    expect(getByText(/giant puzzle/)).toBeInTheDocument();
    expect(getByText("Meet Abraham")).toBeInTheDocument();
    expect(getByText("Cebu").closest("li")).toHaveTextContent("Formerly Cebu");
    expect(getAllByText(/\(done\)/)).toHaveLength(5);
    expect(getByRole("img", { name: /QR code linking to Javier et al\. \(2025\)/ }).querySelector("path")).not.toBeNull();
    expect(getByRole("link", { name: /Javier et al\. \(2025\), GigaByte/ })).toHaveAttribute(
      "href",
      "https://doi.org/10.46471/gigabyte.150",
    );
  });
});
