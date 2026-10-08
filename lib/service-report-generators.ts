/**
 * Shortcut catalog for the Service Report Generator launchpad.
 *
 * Titles, colors, and fallback addresses live here. Live `href` values
 * are stored in `service_report_generator` so staff can change the lab
 * IP from the dashboard without a deploy.
 *
 * Staff can also add their own templates from the dashboard. Those rows
 * carry a title (plus description, icon, and accent) and render after the
 * built-in cards.
 *
 * Bare IPs and host:port values are treated as http://.
 */
import {
  deleteDataFromDB,
  getRowsFromDB,
  saveDataToDB,
  supabase,
} from "@/lib/supabase";
import type { ServiceReportGeneratorRow } from "@/types/database";

export const GENERATOR_ICON_KEYS = [
  "layers",
  "dna",
  "bacteria",
  "biohazard",
  "microscope",
  "flask",
  "test-tube",
  "sprout",
  "file-text",
  "sliders",
] as const;

export type GeneratorIconKey = (typeof GENERATOR_ICON_KEYS)[number];

/** Accent swatches offered when adding a template. */
export const GENERATOR_ACCENTS = [
  "#2a7797",
  "#4ec2bb",
  "#6bb155",
  "#8b6bb1",
  "#d4537e",
  "#d0812c",
  "#5f6b73",
] as const;

export type ServiceReportGenerator = {
  id: string;
  title: string;
  description: string;
  /** Public URL, LAN IP, or host:port. Leave empty until the generator is online. */
  href: string;
  /** Key into GENERATOR_ICON_KEYS. */
  icon: GeneratorIconKey;
  accent: string;
  tint: string;
  /** True for templates staff added from the dashboard. */
  custom?: boolean;
  /**
   * When false, the shared lab-host field leaves this address unchanged.
   * Use for generators that do not run on the lab machine.
   */
  shareHost?: boolean;
};

export const SERVICE_REPORT_GENERATORS: readonly ServiceReportGenerator[] = [
  {
    id: "amplicon-assembly",
    icon: "layers",
    title: "Amplicon Assembly",
    description:
      "Open the amplicon assembly report generator to draft a client-ready service report.",
    href: "http://10.49.42.113:5050",
    accent: "#2a7797",
    tint: "#e6f4f8",
  },
  {
    id: "whole-genome-assembly",
    icon: "dna",
    title: "Whole Genome Assembly",
    description:
      "Open the whole genome assembly report generator for WGS analyses.",
    href: "http://10.49.42.113:5051",
    accent: "#4ec2bb",
    tint: "#e7f8f6",
  },
  {
    id: "16s-metabarcoding",
    icon: "bacteria",
    title: "16s Metabarcoding",
    description:
      "Open the 16s metabarcoding report generator for community composition reports.",
    href: "http://10.49.42.113:5070",
    accent: "#6bb155",
    tint: "#eef7ea",
  },
  {
    id: "custom-service-report",
    icon: "sliders",
    title: "Custom Service Report Generator",
    description:
      "Open the custom service report generator for reports that do not use a standard analysis template.",
    href: "http://127.0.0.1:8000",
    accent: "#8b6bb1",
    tint: "#f1eef8",
    shareHost: false,
  },
];

function generatorsSharingHost(
  generators: readonly ServiceReportGenerator[],
): readonly ServiceReportGenerator[] {
  return generators.filter(
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
  generators: readonly ServiceReportGenerator[] = SERVICE_REPORT_GENERATORS,
): ServiceReportGenerator[] {
  return generators.map((generator) => ({
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
export function sharedGeneratorHost(
  hrefs: Record<string, string>,
  generators: readonly ServiceReportGenerator[] = SERVICE_REPORT_GENERATORS,
): string {
  const hosts = generatorsSharingHost(generators).map((generator) =>
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
  generators: readonly ServiceReportGenerator[] = SERVICE_REPORT_GENERATORS,
): Record<string, string> {
  const next: Record<string, string> = { ...hrefs };
  for (const generator of generators) {
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

/** Card for a staff-added row, or null when the row is a built-in address. */
export function customGeneratorFromRow(
  row: ServiceReportGeneratorRow,
): ServiceReportGenerator | null {
  const title = String(row.title ?? "").trim();
  if (!title) return null;
  if (SERVICE_REPORT_GENERATORS.some((generator) => generator.id === row.id)) {
    return null;
  }
  const accent = isAccentHex(row.accent) ? row.accent : GENERATOR_ACCENTS[0];
  return {
    id: row.id,
    title,
    description:
      String(row.description ?? "").trim() || defaultTemplateDescription(title),
    href: typeof row.href === "string" ? row.href : "",
    icon: isGeneratorIconKey(row.icon) ? row.icon : "file-text",
    accent,
    tint: tintFromAccent(accent),
    custom: true,
    shareHost: row.share_host !== false,
  };
}

/** Built-in cards with stored hrefs, then staff templates in sort order. */
export function mergeGenerators(
  rows: readonly ServiceReportGeneratorRow[] | null | undefined,
): ServiceReportGenerator[] {
  const custom = (rows ?? [])
    .map((row) => ({ row, generator: customGeneratorFromRow(row) }))
    .filter(
      (entry): entry is {
        row: ServiceReportGeneratorRow;
        generator: ServiceReportGenerator;
      } => entry.generator !== null,
    )
    .sort(
      (a, b) =>
        (a.row.sort_order ?? 0) - (b.row.sort_order ?? 0) ||
        String(a.row.created_at ?? "").localeCompare(
          String(b.row.created_at ?? ""),
        ) ||
        a.generator.title.localeCompare(b.generator.title),
    )
    .map((entry) => entry.generator);
  return [...generatorsWithHrefs(mergeGeneratorHrefs(rows)), ...custom];
}

export function hrefsOf(
  generators: readonly ServiceReportGenerator[],
): Record<string, string> {
  return Object.fromEntries(
    generators.map((generator) => [generator.id, generator.href]),
  );
}

export async function loadGenerators(): Promise<ServiceReportGenerator[]> {
  try {
    const rows = await getRowsFromDB<ServiceReportGeneratorRow>(
      "service_report_generator",
    );
    return mergeGenerators(rows);
  } catch (error) {
    console.error("Failed to load service report generators:", error);
    return generatorsWithHrefs(catalogHrefById());
  }
}

export async function saveGeneratorHrefMap(
  hrefs: Record<string, string>,
  updatedBy: string | null,
  generators: readonly ServiceReportGenerator[] = SERVICE_REPORT_GENERATORS,
): Promise<Record<string, string>> {
  const saved: Record<string, string> = { ...hrefs };
  for (const generator of generators) {
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

// ---- Staff-added templates ----

export type GeneratorTemplateInput = {
  title: string;
  description: string;
  href: string;
  icon: GeneratorIconKey;
  accent: string;
  shareHost: boolean;
};

export type GeneratorTemplateErrors = Partial<
  Record<"title" | "href" | "accent", string>
>;

export const TEMPLATE_TITLE_MAX = 80;

export function isGeneratorIconKey(value: unknown): value is GeneratorIconKey {
  return (
    typeof value === "string" &&
    (GENERATOR_ICON_KEYS as readonly string[]).includes(value)
  );
}

function isAccentHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function defaultTemplateDescription(title: string): string {
  return `Open the ${title} report generator.`;
}

/** Light card tint: the accent mixed 90% toward white. */
export function tintFromAccent(accent: string): string {
  if (!isAccentHex(accent)) return "#f1f5f9";
  const channels = [1, 3, 5].map((start) =>
    Math.round(
      parseInt(accent.slice(start, start + 2), 16) * 0.1 + 255 * 0.9,
    ),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function validateGeneratorTemplate(
  input: GeneratorTemplateInput,
): GeneratorTemplateErrors {
  const errors: GeneratorTemplateErrors = {};
  const title = input.title.trim();
  if (!title) {
    errors.title = "Enter a title.";
  } else if (title.length > TEMPLATE_TITLE_MAX) {
    errors.title = `Keep the title under ${TEMPLATE_TITLE_MAX} characters.`;
  }
  const href = normalizeGeneratorHref(input.href);
  if (!href) {
    errors.href = "Enter the generator's address.";
  } else if (!href.startsWith("/")) {
    try {
      new URL(href);
    } catch {
      errors.href = "That address doesn't look right. Try 10.49.42.113:5080.";
    }
  }
  if (!isAccentHex(input.accent)) {
    errors.accent = "Pick a color.";
  }
  return errors;
}

/** URL-safe id from the title, suffixed when it's already taken. */
export function generatorTemplateId(
  title: string,
  takenIds: Iterable<string>,
): string {
  const taken = new Set(takenIds);
  for (const generator of SERVICE_REPORT_GENERATORS) taken.add(generator.id);
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "template";
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function templatePayload(
  input: GeneratorTemplateInput,
  updatedBy: string | null,
) {
  const title = input.title.trim();
  return {
    title,
    description:
      input.description.trim() || defaultTemplateDescription(title),
    href: input.href.trim(),
    icon: input.icon,
    accent: input.accent.toLowerCase(),
    share_host: input.shareHost,
    updated_by: updatedBy,
  };
}

function requireCustomGenerator(
  row: ServiceReportGeneratorRow | null | undefined,
): ServiceReportGenerator {
  const generator = row ? customGeneratorFromRow(row) : null;
  if (!generator) throw new Error("The saved template could not be read back.");
  return generator;
}

export async function createGeneratorTemplate(
  input: GeneratorTemplateInput,
  options: {
    existing: readonly ServiceReportGenerator[];
    updatedBy: string | null;
  },
): Promise<ServiceReportGenerator> {
  const id = generatorTemplateId(
    input.title,
    options.existing.map((generator) => generator.id),
  );
  const { data, error } = await supabase
    .from("service_report_generator")
    .insert({
      id,
      ...templatePayload(input, options.updatedBy),
      sort_order: options.existing.filter((generator) => generator.custom)
        .length,
    })
    .select()
    .single();
  if (error) {
    console.error("Error adding service report template:", error);
    throw error;
  }
  return requireCustomGenerator(data as ServiceReportGeneratorRow);
}

export async function updateGeneratorTemplate(
  id: string,
  input: GeneratorTemplateInput,
  updatedBy: string | null,
): Promise<ServiceReportGenerator> {
  const row = await saveDataToDB<ServiceReportGeneratorRow>(
    "service_report_generator",
    id,
    templatePayload(input, updatedBy),
  );
  return requireCustomGenerator(row as ServiceReportGeneratorRow);
}

export async function deleteGeneratorTemplate(id: string): Promise<void> {
  if (SERVICE_REPORT_GENERATORS.some((generator) => generator.id === id)) {
    throw new Error("Built-in generators can't be removed.");
  }
  await deleteDataFromDB("service_report_generator", id);
}
