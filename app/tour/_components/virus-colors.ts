import type { VirusRole } from "@/lib/tour-virus";
import { BRAND, LOGO } from "./brand";

/** The schematic in tour colours: a teal envelope with teal spikes, one picked out in logo orange. */
export const ROLE_COLORS: Record<VirusRole, string> = {
  envelope: BRAND.deepTeal,
  stem: "#1f9e8a",
  lobe: BRAND.teal,
  highlightStem: "#c96a00",
  highlightLobe: LOGO.orange,
};

/** Spike chains A/B/C, matching the Infrastructure slide's spec colours. */
export const CHAIN_COLORS = [
  ["A", BRAND.teal],
  ["B", "#6cc4e6"],
  ["C", "#d7a6d7"],
] as const;

export const MARKER = LOGO.orange;
