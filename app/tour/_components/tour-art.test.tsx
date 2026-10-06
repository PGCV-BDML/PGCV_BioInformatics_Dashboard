import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FALLBACK_TOUR } from "@/lib/tour";
import { LogoHelix } from "./logo-helix";
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
