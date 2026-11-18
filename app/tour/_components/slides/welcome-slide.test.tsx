import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FALLBACK_TOUR } from "@/lib/tour";
import { WelcomeSlide, factPicture } from "./welcome-slide";

describe("WelcomeSlide", () => {
  it("draws the cores and the storage for the facts that name them", () => {
    expect(factPicture({ value: "240", label: "CPU cores in our HPC cluster" })).toBe("cores");
    expect(factPicture({ value: "360 TB", label: "of genomic data storage" })).toBe("storage");
    expect(factPicture({ value: "15", label: "years of training" })).toBeNull();
  });

  it("gives a 240-core cluster 240 squares, and keeps the art out of the page's words", () => {
    const content = { ...FALLBACK_TOUR, hero: { ...FALLBACK_TOUR.hero, facts: [{ value: "240", label: "CPU cores in our HPC cluster" }] } };
    const { container } = render(<WelcomeSlide content={content} audience="general" />);
    const grid = container.querySelector("dd [aria-hidden=true] > span");
    expect(grid?.childElementCount).toBe(240);
    expect(screen.getByRole("heading", { level: 1, name: content.hero.title })).toBeInTheDocument();
    // The helix, the flying bases and the read are decoration.
    for (const art of container.querySelectorAll("[aria-hidden=true]")) {
      expect(art.closest("h1, p")).toBeNull();
    }
    expect(screen.getByText("240")).toBeInTheDocument();
  });
});
