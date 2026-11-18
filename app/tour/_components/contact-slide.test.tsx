import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FALLBACK_TOUR, type TourContent } from "@/lib/tour";
import {
  CONTACT_EYEBROW,
  ContactSlide,
  SCAN_HELIX,
  SCAN_TITLE,
  scanSpots,
  THREAD_HELIX,
  threadSpots,
} from "./slides/contact-slide";

const contact: TourContent["contact"] = {
  title: "Have a sample, a dataset or a question?",
  intro: "Request a service, join a training, or apply for an internship.",
  emails: [
    { label: "Bioinformatics Laboratory", address: "bioinfo.pgc.upvisayas@up.edu.ph" },
    { label: "Sequencing & Laboratory Services", address: "sequencing.pgc.upvisayas@up.edu.ph" },
    { label: "Office-related concerns", address: "pgc.upvisayas@up.edu.ph" },
  ],
  social: { handle: "@PGCVisayas", platforms: ["Facebook", "LinkedIn", "YouTube"] },
  qrCodes: [
    { label: "Website", url: "https://pgcvisayas.upv.edu.ph/" },
    { label: "Omics Solutions Portal", url: "https://omics.pgcvisayas.upv.edu.ph/" },
    { label: "Social Media Accounts", url: "https://linktr.ee/qr/social" },
    { label: "Feedback Form", url: "https://linktr.ee/qr/feedback" },
  ],
};
const content: TourContent = { ...FALLBACK_TOUR, contact };

/** The content area on the canvas, and the room a code's two lines of label take under its plate. */
const AREA = { width: 1112, height: 572 };
const LABEL_ROOM = 70;

describe("threadSpots", () => {
  it("hangs four codes along the thread, evenly spaced and inside the content area", () => {
    const spots = threadSpots(4);
    expect(spots).toHaveLength(4);
    const centres = spots.map((s) => s.left + s.cell / 2);
    const gaps = centres.slice(1).map((c, i) => c - centres[i]!);
    for (const gap of gaps) expect(Math.abs(gap - gaps[0]!)).toBeLessThanOrEqual(1);
    for (const [i, spot] of spots.entries()) {
      // The plate never runs past the side margins; its label may reach a little into them.
      expect(spot.left + (spot.cell - spot.plate) / 2, `plate ${i}`).toBeGreaterThanOrEqual(0);
      expect(spot.left + (spot.cell + spot.plate) / 2, `plate ${i}`).toBeLessThanOrEqual(AREA.width);
      expect(spot.top + spot.plate + LABEL_ROOM, `code ${i}`).toBeLessThanOrEqual(AREA.height);
      if (i > 0) expect(spot.left).toBeGreaterThanOrEqual(spots[i - 1]!.left + spots[i - 1]!.cell);
    }
    // The thread rises to the right, and the glow reaches the codes from left to right.
    expect(spots[3]!.top).toBeLessThan(spots[0]!.top);
    expect(spots.map((s) => s.wave)).toEqual([...spots.map((s) => s.wave)].sort((a, b) => a - b));
  });

  it("keeps labels apart however many codes there are", () => {
    for (const count of [1, 2, 3, 5, 6, 7]) {
      const spots = threadSpots(count);
      for (let i = 1; i < count; i++) expect(spots[i]!.left, `${count} codes`).toBeGreaterThanOrEqual(spots[i - 1]!.left + spots[i - 1]!.cell);
    }
    // One code hangs in the middle of the slide.
    const [only] = threadSpots(1);
    expect(only!.left + only!.cell / 2 + 84).toBe(640);
  });
});

describe("scanSpots", () => {
  it("puts four codes in two columns at the right margin, as large as fits", () => {
    const spots = scanSpots(4);
    expect(spots.map((s) => s.plate)).toEqual([184, 184, 184, 184]);
    expect(spots[1]!.left + spots[1]!.cell).toBe(AREA.width);
    expect(spots[0]!.top).toBe(spots[1]!.top);
    expect(spots[2]!.left).toBe(spots[0]!.left);
    // Centred top to bottom.
    const bottom = spots[3]!.top + 232;
    expect(Math.abs(spots[0]!.top - (AREA.height - bottom))).toBeLessThanOrEqual(1);
  });

  it("shrinks the codes to fit more rows, and keeps them on the slide", () => {
    for (const count of [1, 2, 3, 5, 6]) {
      const spots = scanSpots(count);
      for (const spot of spots) {
        expect(spot.top, `${count} codes`).toBeGreaterThanOrEqual(0);
        expect(spot.top + spot.plate + 48, `${count} codes`).toBeLessThanOrEqual(AREA.height);
        expect(spot.left + spot.cell).toBeLessThanOrEqual(AREA.width);
      }
    }
    expect(scanSpots(6)[0]!.plate).toBeLessThan(184);
  });
});

describe("ContactSlide", () => {
  it("bookends the title slide and hangs the QR codes on the helix", () => {
    const { container } = render(<ContactSlide content={content} audience="general" />);
    expect(screen.getByText(CONTACT_EYEBROW)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Philippine Genome Center Visayas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(contact.title);
    expect(screen.getByText(contact.intro as string)).toBeInTheDocument();
    expect(screen.getByText("@PGCVisayas")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Find us on" })).getAllByRole("listitem")).toHaveLength(3);
    for (const email of contact.emails) {
      const link = container.querySelector(`a[href="mailto:${email.address}"]`);
      expect(link, email.address).toHaveTextContent(`${email.label}${email.address}`);
    }
    const codes = within(screen.getByRole("list", { name: "Scan with your phone" })).getAllByRole("link");
    expect(codes.map((a) => a.getAttribute("href"))).toEqual(contact.qrCodes.map((q) => q.url));
    for (const qr of contact.qrCodes) expect(screen.getByRole("img", { name: `QR code for the PGC Visayas ${qr.label}` })).toBeInTheDocument();
    // The helix lies across the slide, as decoration.
    const helix = container.querySelector(`[data-helix-pairs="${THREAD_HELIX.pairs}"]`);
    expect(helix).not.toBeNull();
    expect(helix!.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("turns into its QR codes for the Visual audience, in front of the title slide's helix", () => {
    const { container } = render(<ContactSlide content={content} audience="visual" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(SCAN_TITLE);
    expect(screen.queryByText(contact.intro as string)).not.toBeInTheDocument();
    expect(container.querySelector("a[href^='mailto:']")).toBeNull();
    expect(within(screen.getByRole("list", { name: "Scan with your phone" })).getAllByRole("link")).toHaveLength(4);
    expect(container.querySelector(`[data-helix-pairs="${SCAN_HELIX.pairs}"]`)).not.toBeNull();
    // The viewfinder starts on the first code.
    expect(container.querySelectorAll("[data-locked]")).toHaveLength(1);
    expect(container.querySelector("[data-locked]")).toHaveTextContent("Website");
  });

  it("keeps the emails for the Visual audience when there are no QR codes to scan", () => {
    const { container } = render(<ContactSlide content={{ ...content, contact: { ...contact, qrCodes: [] } }} audience="visual" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(contact.title);
    expect(container.querySelectorAll("a[href^='mailto:']")).toHaveLength(3);
    expect(screen.queryByRole("list", { name: "Scan with your phone" })).not.toBeInTheDocument();
  });
});
