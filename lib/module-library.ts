/**
 * Training module library, sourced from the private bioinfo-modules GitHub
 * repo. Its modules.json is the single source of truth for which modules
 * exist; the dashboard reads it through /api/training-modules/catalog and
 * serves module files through /api/training-modules/f/… (see
 * lib/github-modules.ts). This file holds the client-safe parts.
 */

/**
 * module.html_content_link prefix for a library module, stored by its
 * modules.json `id` so renaming or moving the file in the repo doesn't break
 * courses. The path is looked up from the catalog each time it's opened.
 */
export const GITHUB_MODULE_ID_PREFIX = "github-module:";

/**
 * Older prefix that stored the repo path directly. Still opened as-is; the
 * module_links_by_id migration converts the known ones.
 */
export const GITHUB_MODULE_PREFIX = "github:";

export type ModuleLibraryItem = {
  id: string;
  title: string;
  /** Path inside the repo, e.g. "DNA-Barcoding/dna-barcoding-module.html" */
  path: string;
  /** Picker group label (modules.json `track`) */
  group: string;
  level: string | null;
  duration: string | null;
  summary: string | null;
  hasDataset: boolean;
  /**
   * modules.json `retired`: the entry page is now a redirect. Hidden from the
   * picker, but courses that already include it still open it.
   */
  retired: boolean;
};

type ManifestEntry = {
  id?: unknown;
  name?: unknown;
  folder?: unknown;
  entry?: unknown;
  track?: unknown;
  level?: unknown;
  duration?: unknown;
  summary?: unknown;
  dataset?: unknown;
  retired?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Rejects anything that could escape the repo or reach hidden files:
 * empty or dot-prefixed segments (covers "..", ".git", ".claude"),
 * backslashes, and leading slashes.
 */
export function isSafeRepoPath(path: string): boolean {
  if (!path || path.length > 512 || path.includes("\\")) return false;
  return path
    .split("/")
    .every((segment) => segment.length > 0 && !segment.startsWith("."));
}

/**
 * Turns modules.json into library items, in teaching order. Entries without
 * an entry file (modules still in development) are skipped; retired ones are
 * kept so existing course links still resolve.
 */
export function parseModuleManifest(raw: unknown): ModuleLibraryItem[] {
  const modules = (raw as { modules?: unknown } | null)?.modules;
  if (!Array.isArray(modules)) return [];

  const items: ModuleLibraryItem[] = [];
  const seenPaths = new Set<string>();
  for (const entry of modules as ManifestEntry[]) {
    const id = optionalString(entry?.id);
    const title = optionalString(entry?.name);
    const folder = optionalString(entry?.folder);
    const file = optionalString(entry?.entry);
    if (!id || !title || !folder || !file) continue;

    const path = `${folder}/${file}`;
    if (!isSafeRepoPath(path) || seenPaths.has(path)) continue;
    seenPaths.add(path);

    items.push({
      id,
      title,
      path,
      group: optionalString(entry.track) ?? "Other",
      level: optionalString(entry.level),
      duration: optionalString(entry.duration),
      summary: optionalString(entry.summary),
      hasDataset: Boolean(optionalString(entry.dataset)),
      retired: Boolean(entry.retired),
    });
  }
  return items;
}

/** modules.json ids are lowercase slugs, e.g. "16s-metagenomics". */
export function isSafeModuleId(id: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id);
}

export function moduleLinkForId(id: string): string {
  return `${GITHUB_MODULE_ID_PREFIX}${id}`;
}

/** Module id from a stored html_content_link, or null if it isn't one. */
export function moduleIdFromModuleLink(
  link: string | null | undefined,
): string | null {
  const value = link?.trim();
  if (!value?.startsWith(GITHUB_MODULE_ID_PREFIX)) return null;
  const id = value.slice(GITHUB_MODULE_ID_PREFIX.length);
  return isSafeModuleId(id) ? id : null;
}

export function moduleLinkForPath(path: string): string {
  return `${GITHUB_MODULE_PREFIX}${path}`;
}

/** Repo path from a legacy github: link, or null if it isn't one. */
export function repoPathFromModuleLink(
  link: string | null | undefined,
): string | null {
  const value = link?.trim();
  if (!value?.startsWith(GITHUB_MODULE_PREFIX)) return null;
  const path = value.slice(GITHUB_MODULE_PREFIX.length);
  return isSafeRepoPath(path) ? path : null;
}

/** Groups items by track, keeping teaching order within and across groups. */
export function groupLibraryItems(
  items: ModuleLibraryItem[],
): [string, ModuleLibraryItem[]][] {
  const groups = new Map<string, ModuleLibraryItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return Array.from(groups.entries());
}
