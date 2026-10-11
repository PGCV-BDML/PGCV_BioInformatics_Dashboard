import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JOURNEY_SCENE_MS, SampleJourney, spotBase } from "./sample-journey";

afterEach(() => {
  vi.useRealTimers();
});

const scene = () =>
  screen.getAllByRole("button", { name: /^Step \d: / }).findIndex((b) => b.getAttribute("aria-current") === "step");

/** Lets `count` scenes' worth of time pass, one at a time: each scene sets its timer once shown. */
function wait(count: number) {
  for (let i = 0; i < count; i++) act(() => vi.advanceTimersByTime(JOURNEY_SCENE_MS));
}

function journey(props: Partial<React.ComponentProps<typeof SampleJourney>> = {}) {
  return <SampleJourney audience="general" active step={null} onStepChange={() => {}} serverSpecs={null} {...props} />;
}

describe("SampleJourney", () => {
  it("plays its scenes on a timer while on screen, from the first each time", () => {
    vi.useFakeTimers();
    const { rerender } = render(journey({ active: false }));
    wait(2);
    expect(scene()).toBe(0);

    rerender(journey());
    wait(1);
    expect(scene()).toBe(1);
    wait(3);
    expect(scene()).toBe(0);
    wait(2);
    expect(scene()).toBe(2);

    // Off screen and back: it starts over.
    rerender(journey({ active: false }));
    rerender(journey());
    expect(scene()).toBe(0);
  });

  it("stops playing once the visitor picks a step", () => {
    vi.useFakeTimers();
    render(journey());
    fireEvent.click(screen.getByRole("button", { name: "Step 3: Server" }));
    expect(scene()).toBe(2);
    wait(3);
    expect(scene()).toBe(2);
  });

  it("shows the presenter's step and hands clicks back instead of playing", () => {
    vi.useFakeTimers();
    const onStepChange = vi.fn();
    render(journey({ step: 1, onStepChange }));
    expect(scene()).toBe(1);
    wait(2);
    expect(scene()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Step 4: Results" }));
    expect(onStepChange).toHaveBeenCalledWith(3);
  });

  it("switches copy with the audience and names the machines under their steps", () => {
    const { rerender } = render(journey({ serverSpecs: "120 cores · 640 GB · 360 TB" }));
    expect(screen.getByText("Millions of short reads")).toBeInTheDocument();
    expect(screen.getByText("Illumina NextSeq 1000 · iSeq 100")).toBeInTheDocument();
    expect(screen.getByText("120 cores · 640 GB · 360 TB")).toBeInTheDocument();

    rerender(journey({ audience: "technical" }));
    expect(screen.getByText("FASTQ files: millions of reads with quality scores")).toBeInTheDocument();
  });
});

describe("spotBase", () => {
  it("gives every flow-cell spot a fixed letter that changes from round to round", () => {
    const round = (r: number) => Array.from({ length: 84 }, (_, spot) => spotBase(spot, r)).join("");
    expect(round(3)).toBe(round(3));
    expect(round(3)).not.toBe(round(4));
    for (const base of "ACGT") expect(round(0)).toContain(base);
  });
});
