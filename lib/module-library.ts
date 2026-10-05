/**
 * Training module library, sourced from the private bioinfo-modules GitHub
 * repo. Its modules.json is the single source of truth for which modules
 * exist; the dashboard reads it through /api/training-modules/catalog and
 * serves module files through /api/training-modules/f/… (see
 * lib/github-modules.ts). This file holds the client-safe parts.
 */

/** module.html_content_link prefix marking a path inside bioinfo-modules. */
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
 * Turns modules.json into picker items, in teaching order. Entries without an
 * entry file (modules still in development) are skipped.
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
    });
  }
  return items;
}

export function moduleLinkForPath(path: string): string {
  return `${GITHUB_MODULE_PREFIX}${path}`;
}

/** Repo path from a stored html_content_link, or null if it isn't one. */
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
