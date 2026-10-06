/**
 * SARS-CoV-2 "Variant tree" for the public Lab Tour page.
 *
 * The tree file in pgcv-tour-content is produced locally from a Nextstrain
 * build by scripts/slim-auspice.mjs, which strips patient metadata. This
 * parser is the second line of defence: it rebuilds the tree from an
 * allowlist (date, lineage group, province, Pango lineage), so a raw Auspice
 * JSON uploaded by mistake is rejected rather than shown.
 */

export const PHYLO_FORMAT = "pgcv-tour-phylo";

/** Lab Tour tree file paths we are willing to fetch from the content repo. */
export function isSafeTourPhyloPath(path: string): boolean {
  if (!path || path.length > 256 || path.includes("\\")) return false;
  const segments = path.split("/");
  if (segments[0] !== "nextstrain" || segments.length < 2) return false;
  if (!segments.every((s) => s.length > 0 && !s.startsWith("."))) return false;
  return /\.json$/i.test(path);
}

export type PhyloNode = {
  /** Decimal year; tips are rounded to the middle of their month. */
  d: number;
  /** Index into TourPhylo.groups. */
  g: number;
  /** Index into TourPhylo.provinces. */
  p: number;
  /** Index into TourPhylo.lineages (tips only, when assigned). */
  l?: number;
  c?: PhyloNode[];
};

export type TourPhylo = {
  generated: string | null;
  sourceUpdated: string | null;
  groups: { id: string; label: string }[];
  provinces: string[];
  lineages: string[];
  tree: PhyloNode;
};

export class TourPhyloError extends Error {}

const MAX_NODES = 100_000;
const MAX_DEPTH = 5_000;
const LINEAGE_RE = /^[A-Z]{1,3}(\.\d+)*$/;
const LABEL_RE = /^[\p{L}\d .,/&()'-]{1,48}$/u;
const ID_RE = /^[a-z0-9-]{1,24}$/;

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function labels(value: unknown, where: string, re: RegExp): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) {
    throw new TourPhyloError(`${where} must be a non-empty array`);
  }
  return value.map((v, i) => {
    if (typeof v !== "string" || !re.test(v)) throw new TourPhyloError(`${where}[${i}] is not allowed`);
    return v;
  });
}

export function parseTourPhylo(raw: unknown): TourPhylo {
  if (!isObj(raw) || raw.format !== PHYLO_FORMAT || raw.version !== 1) {
    throw new TourPhyloError(`Not a ${PHYLO_FORMAT} v1 file — run scripts/slim-auspice.mjs on the build first`);
  }
  if (!Array.isArray(raw.groups) || raw.groups.length === 0 || raw.groups.length > 12) {
    throw new TourPhyloError("groups must have 1–12 entries");
  }
  const groups = raw.groups.map((g, i) => {
    if (!isObj(g) || typeof g.id !== "string" || !ID_RE.test(g.id) || typeof g.label !== "string" || !LABEL_RE.test(g.label)) {
      throw new TourPhyloError(`groups[${i}] is invalid`);
    }
    return { id: g.id, label: g.label };
  });
  const provinces = labels(raw.provinces, "provinces", LABEL_RE);
  const lineages = Array.isArray(raw.lineages) && raw.lineages.length === 0 ? [] : labels(raw.lineages, "lineages", LINEAGE_RE);

  let count = 0;
  const index = (value: unknown, max: number, where: string): number => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= max) {
      throw new TourPhyloError(`${where} index out of range`);
    }
    return value;
  };

  function node(value: unknown, depth: number): PhyloNode {
    if (++count > MAX_NODES) throw new TourPhyloError("tree has too many nodes");
    if (depth > MAX_DEPTH) throw new TourPhyloError("tree is too deep");
    if (!isObj(value)) throw new TourPhyloError("tree node must be an object");
    const d = value.d;
    if (typeof d !== "number" || !Number.isFinite(d) || d < 2019 || d > 2100) {
      throw new TourPhyloError("tree node date is invalid");
    }
    // Only the allowlisted keys are copied; anything else in the file is dropped.
    const out: PhyloNode = {
      d,
      g: index(value.g, groups.length, "group"),
      p: index(value.p, provinces.length, "province"),
    };
    if (Array.isArray(value.c) && value.c.length > 0) {
      out.c = value.c.map((child) => node(child, depth + 1));
    } else if (value.l !== undefined) {
      out.l = index(value.l, lineages.length, "lineage");
    }
    return out;
  }

  return {
    generated: isoDate(raw.generated),
    sourceUpdated: isObj(raw.source) ? isoDate(raw.source.updated) : null,
    groups,
    provinces,
    lineages,
    tree: node(raw.tree, 0),
  };
}

/** Back to the file format, so the browser can re-check it with parseTourPhylo. */
export function serializeTourPhylo(phylo: TourPhylo) {
  return {
    format: PHYLO_FORMAT,
    version: 1,
    generated: phylo.generated,
    source: { updated: phylo.sourceUpdated },
    groups: phylo.groups,
    provinces: phylo.provinces,
    lineages: phylo.lineages,
    tree: phylo.tree,
  };
}

// --- Dates --------------------------------------------------------------------

/** Decimal year → "YYYY-MM". */
export function monthKey(decimalYear: number): string {
  const year = Math.floor(decimalYear);
  const month = Math.min(11, Math.floor((decimalYear - year) * 12));
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" → decimal year at the start of that month. */
function parseMonth(key: string): [year: number, month: number] {
  const [y = 0, m = 1] = key.split("-").map(Number);
  return [y, m];
}

export function monthStart(key: string): number {
  const [y, m] = parseMonth(key);
  return y + (m - 1) / 12;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(key: string): string {
  const [y, m] = parseMonth(key);
  return `${MONTHS[m - 1]} ${y}`;
}

function nextMonth(key: string): string {
  const [y, m] = parseMonth(key);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// --- Layout -------------------------------------------------------------------

/**
 * Flat, rectangular time-tree layout: x is the decimal year, y the tip order
 * (0…tipCount-1), and an internal node sits midway between its first and last
 * child, as in Auspice. Nodes are in pre-order, so parent[i] < i.
 */
export type PhyloLayout = {
  x: Float64Array;
  y: Float64Array;
  parent: Int32Array;
  group: Uint8Array;
  province: Uint8Array;
  /** Pango lineage index, or -1 for internal nodes / unassigned tips. */
  lineage: Int32Array;
  isTip: Uint8Array;
  /** Node indices of the tips, ordered by y. */
  tips: number[];
  minX: number;
  maxX: number;
};

export function layoutPhylo(phylo: TourPhylo): PhyloLayout {
  const order: PhyloNode[] = [];
  const parents: number[] = [];
  const stack: [PhyloNode, number][] = [[phylo.tree, -1]];
  while (stack.length) {
    const [n, parent] = stack.pop()!;
    const i = order.length;
    order.push(n);
    parents.push(parent);
    if (n.c) for (const child of [...n.c].reverse()) stack.push([child, i]);
  }

  const size = order.length;
  const layout: PhyloLayout = {
    x: new Float64Array(size),
    y: new Float64Array(size),
    parent: Int32Array.from(parents),
    group: new Uint8Array(size),
    province: new Uint8Array(size),
    lineage: new Int32Array(size).fill(-1),
    isTip: new Uint8Array(size),
    tips: [],
    minX: Infinity,
    maxX: -Infinity,
  };

  order.forEach((n, i) => {
    layout.x[i] = n.d;
    layout.group[i] = n.g;
    layout.province[i] = n.p;
    if (!n.c) {
      layout.isTip[i] = 1;
      layout.y[i] = layout.tips.length;
      layout.tips.push(i);
      if (n.l !== undefined) layout.lineage[i] = n.l;
    }
    layout.minX = Math.min(layout.minX, n.d);
    layout.maxX = Math.max(layout.maxX, n.d);
  });

  // Post-order (reverse pre-order): each internal node sits between its first
  // and last child. Pre-order visits children in order, so track min/max y.
  const lo = new Float64Array(size).fill(Infinity);
  const hi = new Float64Array(size).fill(-Infinity);
  for (let i = size - 1; i >= 0; i--) {
    if (!layout.isTip[i]) layout.y[i] = (lo[i]! + hi[i]!) / 2;
    const p = layout.parent[i]!;
    if (p >= 0) {
      lo[p] = Math.min(lo[p]!, layout.y[i]!);
      hi[p] = Math.max(hi[p]!, layout.y[i]!);
    }
  }
  return layout;
}

/** Tip counts per month (contiguous, gaps filled with zeros) by group or province. */
export function monthlyCounts(
  layout: PhyloLayout,
  by: "group" | "province",
  categories: number,
): { month: string; counts: number[] }[] {
  const totals = new Map<string, number[]>();
  for (const i of layout.tips) {
    const key = monthKey(layout.x[i]!);
    const row: number[] = totals.get(key) ?? new Array(categories).fill(0);
    const category = layout[by][i]!;
    row[category] = (row[category] ?? 0) + 1;
    totals.set(key, row);
  }
  if (totals.size === 0) return [];
  const keys = [...totals.keys()].sort();
  const last = keys[keys.length - 1]!;
  const out: { month: string; counts: number[] }[] = [];
  for (let k = keys[0]!; k <= last; k = nextMonth(k)) {
    out.push({ month: k, counts: totals.get(k) ?? new Array(categories).fill(0) });
  }
  return out;
}

// --- Summary (server → page, so the slide renders before the tree loads) ------

export type TourPhyloSummary = {
  tipCount: number;
  firstMonth: string;
  lastMonth: string;
  sourceUpdated: string | null;
  groups: { id: string; label: string; count: number }[];
  provinces: { name: string; count: number }[];
};

export function summarizePhylo(phylo: TourPhylo): TourPhyloSummary {
  const groupCounts = new Array(phylo.groups.length).fill(0);
  const provinceCounts = new Array(phylo.provinces.length).fill(0);
  let first = Infinity;
  let last = -Infinity;
  let tipCount = 0;
  const stack = [phylo.tree];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.c) {
      stack.push(...n.c);
      continue;
    }
    tipCount++;
    groupCounts[n.g]++;
    provinceCounts[n.p]++;
    first = Math.min(first, n.d);
    last = Math.max(last, n.d);
  }
  return {
    tipCount,
    firstMonth: monthKey(first),
    lastMonth: monthKey(last),
    sourceUpdated: phylo.sourceUpdated,
    groups: phylo.groups.map((g, i) => ({ ...g, count: groupCounts[i] })),
    provinces: phylo.provinces.map((name, i) => ({ name, count: provinceCounts[i] })),
  };
}
