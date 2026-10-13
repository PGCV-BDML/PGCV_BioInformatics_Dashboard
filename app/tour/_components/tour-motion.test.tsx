import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FALLBACK_TOUR } from "@/lib/tour";
import { JOURNEY_STEPS } from "@/lib/tour-journey";
import { CountUp, formatCount, parseCount } from "./count-up";
import { HelixProgress } from "./helix-progress";
import { JOURNEY_SCENE_MS } from "./sample-journey";
import { TourExperience } from "./tour-experience";

beforeAll(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseCount / formatCount", () => {
  it.each([
    ["120", "60"],
    ["7,412", "3,706"],
    ["360 TB", "180 TB"],
    ["93.6%", "46.8%"],
  ])("formats %s halfway as %s", (value, half) => {
    const parsed = parseCount(value)!;
    expect(formatCount(parsed, parsed.target / 2)).toBe(half);
    expect(formatCount(parsed, parsed.target)).toBe(value);
  });

  it("leaves values without a leading number alone", () => {
    expect(parseCount("Petabytes")).toBeNull();
  });
});

describe("CountUp", () => {
  it("renders the final value before it is revealed", () => {
    render(<CountUp value="7,412" />);
    expect(screen.getByText("7,412")).toBeInTheDocument();
  });
});

describe("HelixProgress", () => {
  it("marks the current slide and jumps to the one clicked", () => {
    const onSelect = vi.fn();
    render(<HelixProgress labels={["Welcome", "Services", "Contact"]} current={1} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Go to Services" })).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Go to Contact" }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

describe("auto-advance", () => {
  it("moves to the next slide every 20 seconds, longer for sample to sequence, and wraps to the start", () => {
    vi.useFakeTimers();
    render(<TourExperience content={FALLBACK_TOUR} stats={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Present" }));
    const auto = screen.getByRole("button", { name: "Auto-advance" });
    fireEvent.click(auto);
    expect(auto).toHaveAttribute("aria-pressed", "true");

    const slides = screen.getAllByRole("button", { name: /^Go to / });
    const currentSlide = () => slides.findIndex((b) => b.getAttribute("aria-current") === "step");
    expect(currentSlide()).toBe(0);

    act(() => vi.advanceTimersByTime(19_000));
    expect(currentSlide()).toBe(0);
    act(() => vi.advanceTimersByTime(1_000));
    expect(currentSlide()).toBe(1);

    // Sample to sequence stays up until all its scenes have played.
    const journeyMs = JOURNEY_STEPS.length * JOURNEY_SCENE_MS;
    expect(slides[currentSlide() + 1]).toHaveAccessibleName("Go to Sample to sequence");
    act(() => vi.advanceTimersByTime(20_000));
    act(() => vi.advanceTimersByTime(journeyMs - 1_000));
    expect(slides[currentSlide()]).toHaveAccessibleName("Go to Sample to sequence");
    act(() => vi.advanceTimersByTime(1_000));
    expect(currentSlide()).toBe(3);

    for (let i = 4; i < slides.length; i++) act(() => vi.advanceTimersByTime(20_000));
    expect(currentSlide()).toBe(slides.length - 1);
    act(() => vi.advanceTimersByTime(20_000));
    expect(currentSlide()).toBe(0);
  });
});
