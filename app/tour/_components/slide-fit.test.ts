import { describe, expect, it } from "vitest";
import { largestFittingZoom, MIN_SLIDE_ZOOM } from "./slide-fit";

describe("largestFittingZoom", () => {
  it("keeps full size when the slide already fits", () => {
    expect(largestFittingZoom(() => true)).toBe(1);
  });

  it("finds the largest zoom whose height fits", () => {
    // 1000 px of content on a 650 px screen fits at 0.65 and below.
    expect(largestFittingZoom((zoom) => 1000 * zoom <= 650)).toBe(0.65);
  });

  it("handles layouts that reflow into fewer rows as they shrink", () => {
    // Below 0.8 the cards fit on one row, so the content is much shorter.
    const height = (zoom: number) => (zoom < 0.8 ? 500 : 1200) * zoom;
    expect(largestFittingZoom((zoom) => height(zoom) <= 600)).toBe(0.79);
  });

  it("stops at the minimum when nothing fits", () => {
    expect(largestFittingZoom(() => false)).toBe(MIN_SLIDE_ZOOM);
  });
});
