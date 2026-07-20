import { describe, it, expect } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  it('formats "2024-01-15" to "01/15/2024"', () => {
    expect(formatDate("2024-01-15")).toBe("01/15/2024");
  });

  it('formats "2024-12-31" to "12/31/2024"', () => {
    expect(formatDate("2024-12-31")).toBe("12/31/2024");
  });

  it('formats "2026-07-20" to "07/20/2026"', () => {
    expect(formatDate("2026-07-20")).toBe("07/20/2026");
  });

  it('returns "" for null', () => {
    expect(formatDate(null)).toBe("");
  });

  it('returns "" for undefined', () => {
    expect(formatDate(undefined)).toBe("");
  });

  it('returns "" for empty string', () => {
    expect(formatDate("")).toBe("");
  });

  it('returns raw string for "invalid" (not YYYY-MM-DD)', () => {
    expect(formatDate("invalid")).toBe("invalid");
  });

  it('returns raw string for "2024" (only 1 part)', () => {
    expect(formatDate("2024")).toBe("2024");
  });

  it('returns raw string for "2024-01" (only 2 parts)', () => {
    expect(formatDate("2024-01")).toBe("2024-01");
  });
});
