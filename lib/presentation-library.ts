import { isSafeModuleId, isSafeRepoPath } from "@/lib/module-library";

/**
 * Training presentation library, sourced from the private
 * bioinfo-presentations GitHub repo. Its presentations.json is the catalog
 * the dashboard attaches to a program. Files are served through
 * /api/training-presentations/f/… (see lib/github-presentations.ts).
 */

/** presentation.content_link prefix. Programs store the catalog id, not the file path. */
export const GITHUB_PRESENTATION_ID_PREFIX = "github-presentation:";

export type PresentationLibraryItem = {
  id: string;
  title: string;
  /** Path inside the repo, e.g. "basic-coding.html". */
  path: string;
  /** Picker group label (presentations.json `track`). */
  group: string;
  duration: string | null;
  summary: string | null;
  /**
   * presentations.json `retired`: hidden from the picker, but programs that
   * already include it still open it.
   */
  retired: boolean;
};

type ManifestEntry = {
  id?: unknown;
  name?: unknown;
  folder?: unknown;
  entry?: unknown;
  track?: unknown;
  duration?: unknown;
  summary?: unknown;
  retired?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Turns presentations.json into library items, in listed order. Entries
 * without an HTML file are skipped. Retired ones are kept so existing
 * program links still resolve.
 */
export function parsePresentationManifest(
  raw: unknown,
): PresentationLibraryItem[] {
  const presentations = (raw as { presentations?: unknown } | null)
    ?.presentations;
  if (!Array.isArray(presentations)) return [];

  const items: PresentationLibraryItem[] = [];
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  for (const entry of presentations as ManifestEntry[]) {
    const id = optionalString(entry?.id);
    const title = optionalString(entry?.name);
    const file = optionalString(entry?.entry);
    const folder = optionalString(entry?.folder);
    if (!id || !title || !file || !isSafeModuleId(id) || seenIds.has(id)) {
      continue;
    }

    const path = folder ? `${folder}/${file}` : file;
    if (
      !isSafeRepoPath(path) ||
      !/\.html?$/i.test(path) ||
      seenPaths.has(path)
    ) {
      continue;
    }
    seenIds.add(id);
    seenPaths.add(path);

    items.push({
      id,
      title,
      path,
      group: optionalString(entry.track) ?? "Presentations",
      duration: optionalString(entry.duration),
      summary: optionalString(entry.summary),
      retired: Boolean(entry.retired),
    });
  }
  return items;
}

export function presentationLinkForId(id: string): string {
  return `${GITHUB_PRESENTATION_ID_PREFIX}${id}`;
}

/** Catalog id from a stored content_link, or null if it isn't one. */
export function presentationIdFromLink(
  link: string | null | undefined,
): string | null {
  const value = link?.trim();
  if (!value?.startsWith(GITHUB_PRESENTATION_ID_PREFIX)) return null;
  const id = value.slice(GITHUB_PRESENTATION_ID_PREFIX.length);
  return isSafeModuleId(id) ? id : null;
}

/** Groups items by track, keeping catalog order within and across groups. */
export function groupPresentationItems(
  items: PresentationLibraryItem[],
): [string, PresentationLibraryItem[]][] {
  const groups = new Map<string, PresentationLibraryItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return Array.from(groups.entries());
}
