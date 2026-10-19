import { isSafeModuleId } from "@/lib/module-library";

/**
 * Checklist progress reported by library modules (e.g. the NFDI Software
 * Setup module) through the hidden /module-bridge page.
 *
 * Bridge protocol (window.postMessage, same origin only):
 *   bridge → module  { source: "pgcv-bridge", type: "ready" }
 *   module → bridge  { source: "pgcv-module", type: "load", moduleId }
 *   bridge → module  { source: "pgcv-bridge", type: "state", moduleId, signedIn, items? }
 *   module → bridge  { source: "pgcv-module", type: "save", moduleId, items }
 *   bridge → module  { source: "pgcv-bridge", type: "saved", moduleId, ok, at?, error? }
 *
 * Item ids match the module's `checklist` in bioinfo-modules/modules.json.
 */

export const MODULE_PROGRESS_PLATFORMS = ["windows", "macos", "linux"] as const;
export type ModuleProgressPlatform = (typeof MODULE_PROGRESS_PLATFORMS)[number];

/** Matches the evidence length check in the module_progress table. */
export const MAX_EVIDENCE_LENGTH = 4000;
/** Upper bound on items accepted in one save, well above any real checklist. */
export const MAX_ITEMS_PER_SAVE = 64;

export type ModuleProgressItem = {
  item_id: string;
  done: boolean;
  evidence: string | null;
  platform: ModuleProgressPlatform | null;
  completed_at: string | null;
};

export type ChecklistItem = { id: string; label: string };

export type ChecklistItemProgress = ChecklistItem & {
  done: boolean;
  evidence: string | null;
  platform: ModuleProgressPlatform | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type ProgressSummary = {
  done: number;
  total: number;
  items: ChecklistItemProgress[];
};

type ProgressRowLike = {
  user_id: string;
  module_id: string;
  item_id: string;
  done: boolean;
  evidence?: string | null;
  platform?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
};

function isPlatform(value: unknown): value is ModuleProgressPlatform {
  return (
    typeof value === "string" &&
    (MODULE_PROGRESS_PLATFORMS as readonly string[]).includes(value)
  );
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Cleans items posted by a module before they reach the database: drops
 * malformed or duplicate ids, caps evidence length, and only keeps a
 * completion time on items marked done.
 */
export function sanitizeProgressItems(input: unknown): ModuleProgressItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const items: ModuleProgressItem[] = [];
  for (const raw of input.slice(0, MAX_ITEMS_PER_SAVE)) {
    const value = raw as Record<string, unknown> | null;
    const id = typeof value?.item_id === "string" ? value.item_id.trim() : "";
    if (!id || !isSafeModuleId(id) || seen.has(id)) continue;
    seen.add(id);
    const done = value?.done === true;
    const evidence =
      typeof value?.evidence === "string" && value.evidence.trim()
        ? value.evidence.slice(0, MAX_EVIDENCE_LENGTH)
        : null;
    items.push({
      item_id: id,
      done,
      evidence,
      platform: isPlatform(value?.platform) ? value.platform : null,
      completed_at: done ? isoOrNull(value?.completed_at) : null,
    });
  }
  return items;
}

/** One learner's progress on one module, in checklist order. */
export function summarizeProgress(
  checklist: ChecklistItem[],
  rows: ProgressRowLike[],
): ProgressSummary {
  const byItem = new Map(rows.map((row) => [row.item_id, row]));
  const items = checklist.map((item) => {
    const row = byItem.get(item.id);
    return {
      ...item,
      done: Boolean(row?.done),
      evidence: row?.evidence ?? null,
      platform: isPlatform(row?.platform) ? row.platform : null,
      completed_at: row?.completed_at ?? null,
      updated_at: row?.updated_at ?? null,
    };
  });
  return {
    done: items.filter((item) => item.done).length,
    total: checklist.length,
    items,
  };
}

/** Progress per learner for one module. Learners with no rows get 0 done. */
export function progressByUser(
  rows: ProgressRowLike[],
  moduleId: string,
  checklist: ChecklistItem[],
  userIds: string[],
): Map<string, ProgressSummary> {
  const grouped = new Map<string, ProgressRowLike[]>();
  for (const row of rows) {
    if (row.module_id !== moduleId) continue;
    const list = grouped.get(row.user_id) ?? [];
    list.push(row);
    grouped.set(row.user_id, list);
  }
  const result = new Map<string, ProgressSummary>();
  for (const userId of userIds) {
    result.set(userId, summarizeProgress(checklist, grouped.get(userId) ?? []));
  }
  return result;
}

export const PLATFORM_LABELS: Record<ModuleProgressPlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};
