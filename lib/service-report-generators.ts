/**
 * Shortcut catalog for the Service Report Generator launchpad.
 *
 * Titles, colors, and fallback addresses live here. Live `href` values
 * are stored in `service_report_generator` so staff can change the lab
 * IP from the dashboard without a deploy.
 *
 * Bare IPs and host:port values are treated as http://.
 */
import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import type { ServiceReportGeneratorRow } from "@/types/database";

export type ServiceReportGenerator = {
  id: string;
  title: string;
  description: string;
  /** Public URL, LAN IP, or host:port. Leave empty until the generator is online. */
  href: string;
  accent: string;
  tint: string;
  /**
   * When false, the shared lab-host field leaves this address unchanged.
   * Use for generators that do not run on the lab machine.
   */
  shareHost?: boolean;
};

export const SERVICE_REPORT_GENERATORS: readonly ServiceReportGenerator[] = [
  {
    id: "amplicon-assembly",
    title: "Amplicon Assembly",
    description:
      "Open the amplicon assembly report generator to draft a client-ready service report.",
    href: "http://10.49.42.113:5050",
    accent: "#2a7797",
    tint: "#e6f4f8",
  },
  {
    id: "whole-genome-assembly",
    title: "Whole Genome Assembly",
    description:
      "Open the whole genome assembly report generator for WGS analyses.",
    href: "http://10.49.42.113:5051",
    accent: "#4ec2bb",
    tint: "#e7f8f6",
  },
  {
    id: "16s-metabarcoding",
    title: "16s Metabarcoding",
    description:
      "Open the 16s metabarcoding report generator for community composition reports.",
    href: "http://10.49.42.113:5070",
    accent: "#6bb155",
    tint: "#eef7ea",
  },
  {
    id: "custom-service-report",
    title: "Custom Service Report Generator",
    description:
      "Open the custom service report generator for reports that do not use a standard analysis template.",
    href: "http://127.0.0.1:8000",
    accent: "#8b6bb1",
    tint: "#f1eef8",
    shareHost: false,
  },
];

function generatorsSharingHost(): readonly ServiceReportGenerator[] {
  return SERVICE_REPORT_GENERATORS.filter(
    (generator) => generator.shareHost !== false,
  );
}

/** Catalog fallbacks keyed by generator id. */
export function catalogHrefById(): Record<string, string> {
  return Object.fromEntries(
    SERVICE_REPORT_GENERATORS.map((generator) => [generator.id, generator.href]),
  );
}

/** Overlay stored hrefs onto the catalog. Unknown ids are ignored. */
export function mergeGeneratorHrefs(
  stored:
    | ReadonlyArray<{ id: string; href: string | null | undefined }>
    | null
    | undefined,
): Record<string, string> {
  const next = catalogHrefById();
  for (const row of stored ?? []) {
    if (!Object.prototype.hasOwnProperty.call(next, row.id)) continue;
    if (typeof row.href !== "string") continue;
    next[row.id] = row.href;
  }
  return next;
}

export function generatorsWithHrefs(
  hrefById: Record<string, string>,
): ServiceReportGenerator[] {
  return SERVICE_REPORT_GENERATORS.map((generator) => ({
    ...generator,
    href: hrefById[generator.id] ?? generator.href,
  }));
}

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

/** Hostname only, for the shared lab-IP field. */
export function normalizeHostInput(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  try {
    const asUrl = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? new URL(trimmed)
      : new URL(`http://${trimmed}`);
    return asUrl.hostname;
  } catch {
    return trimmed;
  }
}

export function hostFromHref(href: string | null | undefined): string {
  const normalized = normalizeGeneratorHref(href);
  if (!normalized || normalized.startsWith("/")) return "";
  try {
    return new URL(normalized).hostname;
  } catch {
    return "";
  }
}

/** Shared hostname when every address points at the same machine. */
export function sharedGeneratorHost(hrefs: Record<string, string>): string {
  const hosts = generatorsSharingHost().map((generator) =>
    hostFromHref(hrefs[generator.id] ?? ""),
  );
  const first = hosts[0];
  if (!first) return "";
  return hosts.every((host) => host === first) ? first : "";
}

export function replaceGeneratorHost(
  href: string,
  nextHost: string,
): string {
  const host = normalizeHostInput(nextHost);
  if (!host) return href;
  const normalized = normalizeGeneratorHref(href);
  if (!normalized || normalized.startsWith("/")) return href;
  try {
    const url = new URL(normalized);
    url.hostname = host;
    const rendered = url.toString();
    return rendered.endsWith("/") && !normalized.endsWith("/")
      ? rendered.slice(0, -1)
      : rendered;
  } catch {
    return href;
  }
}

export function applySharedHost(
  hrefs: Record<string, string>,
  nextHost: string,
): Record<string, string> {
  const next: Record<string, string> = { ...hrefs };
  for (const generator of SERVICE_REPORT_GENERATORS) {
    if (generator.shareHost === false) {
      next[generator.id] = hrefs[generator.id] ?? generator.href;
      continue;
    }
    next[generator.id] = replaceGeneratorHost(
      hrefs[generator.id] ?? "",
      nextHost,
    );
  }
  return next;
}

export function displayGeneratorHref(href: string | null | undefined): string {
  const normalized = normalizeGeneratorHref(href);
  if (!normalized) return "";
  return normalized.replace(/^https?:\/\//i, "");
}

export async function loadGeneratorHrefMap(): Promise<Record<string, string>> {
  try {
    const rows = await getRowsFromDB<ServiceReportGeneratorRow>(
      "service_report_generator",
    );
    return mergeGeneratorHrefs(rows);
  } catch (error) {
    console.error("Failed to load service report generator addresses:", error);
    return catalogHrefById();
  }
}

export async function saveGeneratorHrefMap(
  hrefs: Record<string, string>,
  updatedBy: string | null,
): Promise<Record<string, string>> {
  const saved: Record<string, string> = { ...hrefs };
  for (const generator of SERVICE_REPORT_GENERATORS) {
    const href = String(hrefs[generator.id] ?? "").trim();
    const row = await saveDataToDB<ServiceReportGeneratorRow>(
      "service_report_generator",
      generator.id,
      {
        href,
        updated_by: updatedBy,
      },
    );
    saved[generator.id] =
      typeof row?.href === "string" ? row.href : href;
  }
  return saved;
}
