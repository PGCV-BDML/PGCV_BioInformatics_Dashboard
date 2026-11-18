import { describe, expect, it } from "vitest";
import { MIN_SAFETY_SCALE, safetyScale } from "./fit-check";

describe("safetyScale", () => {
  it("leaves a slide that fits alone", () => {
    expect(safetyScale(400, 380)).toBe(1);
    expect(safetyScale(400, 400)).toBe(1);
  });

  it("shrinks a slide that runs over just enough to fit", () => {
    expect(safetyScale(400, 420)).toBe(0.952);
  });

  it("never shrinks below the floor, so text stays readable", () => {
    expect(safetyScale(400, 800)).toBe(MIN_SAFETY_SCALE);
  });
});
