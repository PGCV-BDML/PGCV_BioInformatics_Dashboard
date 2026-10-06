import type { ServiceColor } from "@/lib/tour";

/**
 * PGC Visayas brand colours (PGC Brand Guide 2025). Teal #12ca99 is too light
 * for text on light backgrounds, so small text uses the darker `tealInk`.
 */
export const BRAND = {
  teal: "#12ca99",
  tealInk: "#0a7558",
  deepTeal: "#2a7797",
  purple: "#5e205e",
  navy: "#2b3278",
} as const;

/**
 * The logo's helix gradient, left to right. Sampled from
 * public/assets/pgcv_logo.png; use for art and accents, not body text.
 */
export const LOGO = {
  orange: "#ff8601",
  red: "#e5332a",
  crimson: "#c51b4a",
  magenta: "#9c1f7a",
  purple: "#8a2990",
  violet: "#65328f",
  indigo: "#3b3694",
  blue: "#0176c3",
} as const;

// Content keeps its colour names; they map onto the PGCV palette here.
export const SERVICE_HEX: Record<ServiceColor, string> = {
  purple: BRAND.purple,
  magenta: "#912a8c",
  mint: BRAND.tealInk,
  coral: BRAND.deepTeal,
  indigo: BRAND.navy,
};

/** White card used across the tour's light sections. */
export const CARD = "rounded-2xl border border-[#2b3278]/10 bg-white shadow-[0_10px_30px_-12px_rgba(43,50,120,0.18)]";
