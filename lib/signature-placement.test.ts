import { describe, expect, it } from "vitest";
import {
  clampSignatureRect,
  cssBoxToPdfRect,
  MAX_SIGNATURE_HEIGHT_PT,
  MAX_SIGNATURE_WIDTH_PT,
  MIN_SIGNATURE_WIDTH_PT,
  nudgeSignatureRect,
  pdfRectToCss,
  readPngSize,
  resizeSignatureRect,
} from "./signature-placement";

const A4 = { width: 595.28, height: 841.89 };

describe("clampSignatureRect", () => {
  it("leaves an on-page default stamp unchanged", () => {
    const rect = { x: 72, y: 122, width: 160, height: 40 };
    expect(clampSignatureRect(rect, A4, 160 / 40)).toEqual(rect);
  });

  it("pulls a stamp that hangs off the right/top back onto the page", () => {
    const clamped = clampSignatureRect(
      { x: 700, y: 900, width: 160, height: 40 },
      A4,
      4,
    );
    expect(clamped.x + clamped.width).toBeCloseTo(A4.width, 5);
    expect(clamped.y + clamped.height).toBeCloseTo(A4.height, 5);
    expect(clamped.width).toBe(160);
    expect(clamped.height).toBe(40);
  });

  it("caps width and height at the max stamp box", () => {
    const clamped = clampSignatureRect(
      { x: 10, y: 10, width: 800, height: 200 },
      A4,
      4,
    );
    expect(clamped.width).toBeLessThanOrEqual(MAX_SIGNATURE_WIDTH_PT);
    expect(clamped.height).toBeLessThanOrEqual(MAX_SIGNATURE_HEIGHT_PT);
    expect(clamped.width / clamped.height).toBeCloseTo(4, 5);
  });

  it("does not shrink below the minimum width when the page allows it", () => {
    const clamped = clampSignatureRect(
      { x: 10, y: 10, width: 10, height: 2.5 },
      A4,
      4,
    );
    expect(clamped.width).toBe(MIN_SIGNATURE_WIDTH_PT);
    expect(clamped.height).toBeCloseTo(MIN_SIGNATURE_WIDTH_PT / 4, 5);
  });
});

describe("nudgeSignatureRect", () => {
  it("moves by the requested delta and stops at the page edge", () => {
    const start = { x: 0, y: 0, width: 160, height: 40 };
    const moved = nudgeSignatureRect(start, 8, 12, A4, 4);
    expect(moved.x).toBe(8);
    expect(moved.y).toBe(12);

    const blocked = nudgeSignatureRect(start, -20, -20, A4, 4);
    expect(blocked.x).toBe(0);
    expect(blocked.y).toBe(0);
  });
});

describe("resizeSignatureRect", () => {
  it("keeps the top edge stable while changing size", () => {
    const start = { x: 72, y: 100, width: 160, height: 40 };
    const top = start.y + start.height;
    const resized = resizeSignatureRect(start, 200, A4, 4);
    expect(resized.width).toBe(200);
    expect(resized.height).toBe(50);
    expect(resized.x).toBe(72);
    expect(resized.y + resized.height).toBeCloseTo(top, 5);
  });
});

describe("pdfRectToCss / cssBoxToPdfRect", () => {
  it("round-trips a stamp through CSS overlay space", () => {
    const rect = { x: 72, y: 122, width: 160, height: 40 };
    const scale = 1.5;
    const css = pdfRectToCss(rect, A4.height, scale);
    expect(css.left).toBeCloseTo(72 * scale);
    expect(css.width).toBeCloseTo(160 * scale);
    expect(css.top).toBeCloseTo((A4.height - 122 - 40) * scale);

    const back = cssBoxToPdfRect(css, A4.height, scale);
    expect(back.x).toBeCloseTo(rect.x);
    expect(back.y).toBeCloseTo(rect.y);
    expect(back.width).toBeCloseTo(rect.width);
    expect(back.height).toBeCloseTo(rect.height);
  });
});

describe("readPngSize", () => {
  it("reads width and height from a PNG IHDR", () => {
    const bytes = new Uint8Array(24);
    bytes[0] = 0x89;
    bytes[1] = 0x50;
    bytes[2] = 0x4e;
    bytes[3] = 0x47;
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 400);
    view.setUint32(20, 100);
    expect(readPngSize(bytes)).toEqual({ width: 400, height: 100 });
  });

  it("returns null for non-PNG bytes", () => {
    expect(readPngSize(new Uint8Array([0, 1, 2, 3]))).toBeNull();
  });
});
