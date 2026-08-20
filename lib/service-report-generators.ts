/**
 * Shortcut catalog for the Service Report Generator launchpad.
 *
 * Put each generator's public URL or LAN address in `href`.
 * Bare IPs and host:port values are treated as http://.
 */
export type ServiceReportGenerator = {
  id: string;
  title: string;
  description: string;
  /** Public URL, LAN IP, or host:port. Leave empty until the generator is online. */
  href: string;
  accent: string;
  tint: string;
};

export const SERVICE_REPORT_GENERATORS: readonly ServiceReportGenerator[] = [
  {
    id: "amplicon-assembly",
    title: "Amplicon Assembly",
    description:
      "Open the amplicon assembly report generator to draft a client-ready service report.",
    href: "http://10.49.42.66:5050",
    accent: "#2a7797",
    tint: "#e6f4f8",
  },
  {
    id: "whole-genome-assembly",
    title: "Whole Genome Assembly",
    description:
      "Open the whole genome assembly report generator for WGS analyses.",
    href: "",
    accent: "#4ec2bb",
    tint: "#e7f8f6",
  },
  {
    id: "16s-metabarcoding",
    title: "16s Metabarcoding",
    description:
      "Open the 16s metabarcoding report generator for community composition reports.",
    href: "",
    accent: "#6bb155",
    tint: "#eef7ea",
  },
];

/** True when a catalog entry has a usable destination. */
export function isGeneratorHrefReady(href: string | null | undefined): boolean {
  return Boolean(normalizeGeneratorHref(href));
}

/**
 * Accepts a full URL, a path, or a bare IP/host:port.
 * Returns an empty string when nothing usable was provided.
 */
export function normalizeGeneratorHref(
  raw: string | null | undefined,
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `http://${trimmed}`;
}
