#!/usr/bin/env node
/**
 * Turn a Nextstrain/Auspice v2 SARS-CoV-2 build into the small, public-safe
 * tree the Lab Tour's "Variant tree" slide draws (lib/tour-phylo.ts).
 *
 * Auspice builds carry per-patient metadata (age, sex, vaccination, health
 * status, municipality, hospital, sample IDs). Run this locally on the raw
 * build and commit ONLY the output to pgcv-tour-content. The output keeps:
 *   - tree shape and dates (tips rounded to the middle of their month)
 *   - Pango lineage and a coarse lineage group
 *   - province, with provinces under --min-province tips merged into "Other"
 * Everything else — names, mutations, divergence, all other attributes — is
 * dropped.
 *
 * Usage:
 *   node scripts/slim-auspice.mjs <auspice.json> <out.json> [--min-province 20]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PHYLO_FORMAT = "pgcv-tour-phylo";

/**
 * Pango aliases → full names, from cov-lineages/pango-designation
 * alias_key.json (October 2026). Only prefixes seen in our builds are listed;
 * unknown prefixes are reported and fall into "Other".
 */
const PANGO_ALIASES = {
  BA: "B.1.1.529",
  BE: "B.1.1.529.5.3.1",
  BF: "B.1.1.529.5.2.1",
  BN: "B.1.1.529.2.75.5",
  BP: "B.1.1.529.2.3.16",
  BQ: "B.1.1.529.5.3.1.1.1.1",
  BR: "B.1.1.529.2.75.4",
  BT: "B.1.1.529.5.1.21",
  CH: "B.1.1.529.2.75.3.4.1.1",
  CM: "B.1.1.529.2.3.20",
  CP: "B.1.1.529.5.2.6",
  CR: "B.1.1.529.5.2.18",
  DD: "B.1.1.529.2.3.21",
  DF: "B.1.1.529.5.10.1",
  FV: "B.1.1.529.2.3.20.8.1.1",
  AY: "B.1.617.2",
  EG: "XBB.1.9.2",
  EL: "XBB.1.5.14",
  FL: "XBB.1.9.1",
  FU: "XBB.1.16.1",
  FY: "XBB.1.22.1",
  GF: "XBB.1.5.24",
  GJ: "XBB.2.3.3",
  GV: "XBB.1.5.48",
  GW: "XBB.1.19.1",
};

/** Lineage groups in rough order of emergence; first match wins. */
export const LINEAGE_GROUPS = [
  { id: "pre-omicron", label: "Delta & earlier", match: (full) => !full.startsWith("B.1.1.529") && !full.startsWith("X") },
  { id: "ba1", label: "Omicron BA.1", match: (full) => full === "B.1.1.529" || full.startsWith("B.1.1.529.1") },
  { id: "ba2", label: "Omicron BA.2", match: (full) => full.startsWith("B.1.1.529.2") },
  { id: "ba45", label: "Omicron BA.4 / BA.5", match: (full) => /^B\.1\.1\.529\.[45](\.|$)/.test(full) },
  { id: "xbb", label: "XBB", match: (full) => /^XBB(\.|$)/.test(full) && !/^XBB\.1\.(5|9|16)(\.|$)/.test(full) },
  { id: "xbb15", label: "XBB.1.5", match: (full) => /^XBB\.1\.5(\.|$)/.test(full) },
  { id: "xbb19", label: "XBB.1.9", match: (full) => /^XBB\.1\.9(\.|$)/.test(full) },
  { id: "xbb116", label: "XBB.1.16", match: (full) => /^XBB\.1\.16(\.|$)/.test(full) },
  { id: "other", label: "Other / unassigned", match: () => true },
];

const LINEAGE_RE = /^[A-Z]{1,3}(\.\d+)*$/;

/** "CM.8.1" → "B.1.1.529.2.3.20.8.1"; null when the prefix is unknown. */
export function expandLineage(lineage) {
  if (!lineage || !LINEAGE_RE.test(lineage)) return null;
  const [prefix, ...rest] = lineage.split(".");
  if (prefix === "B" || prefix.startsWith("X")) return lineage;
  const full = PANGO_ALIASES[prefix];
  return full ? [full, ...rest].join(".") : null;
}

export function lineageGroup(lineage) {
  const full = expandLineage(lineage);
  if (!full) return LINEAGE_GROUPS.length - 1;
  return LINEAGE_GROUPS.findIndex((g) => g.match(full));
}

/** Decimal year → middle of its calendar month, e.g. 2022.53 → 2022.5417. */
export function monthMidpoint(numDate) {
  const year = Math.floor(numDate);
  const month = Math.min(11, Math.floor((numDate - year) * 12));
  return year + (month + 0.5) / 12;
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
}

function attr(node, key) {
  const v = node.node_attrs?.[key];
  const value = v && typeof v === "object" ? v.value : v;
  return typeof value === "string" ? value.trim() : value;
}

const round3 = (n) => Math.round(n * 1000) / 1000;

function argmax(counts) {
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
  return best;
}

/**
 * @param {unknown} raw parsed Auspice v2 JSON
 * @param {{ minProvince?: number, generated?: string }} [options]
 */
export function slimAuspice(raw, { minProvince = 20, generated = new Date().toISOString().slice(0, 10) } = {}) {
  if (!raw || raw.version !== "v2" || !raw.tree) {
    throw new Error("Expected an Auspice v2 JSON with a tree");
  }
  const roots = Array.isArray(raw.tree) ? raw.tree : [raw.tree];
  if (roots.length !== 1) throw new Error("Expected a single tree");

  // Pass 1: province tip counts, so small ones can be merged.
  const provinceCounts = new Map();
  const unknownPrefixes = new Map();
  (function count(node) {
    if (node.children?.length) return node.children.forEach(count);
    const province = attr(node, "province");
    const key = typeof province === "string" && province ? titleCase(province) : "Other";
    provinceCounts.set(key, (provinceCounts.get(key) ?? 0) + 1);
    const lineage = attr(node, "pangolin_lineage") ?? attr(node, "Nextclade_pango");
    if (typeof lineage === "string" && LINEAGE_RE.test(lineage) && !expandLineage(lineage)) {
      const prefix = lineage.split(".")[0];
      unknownPrefixes.set(prefix, (unknownPrefixes.get(prefix) ?? 0) + 1);
    }
  })(roots[0]);

  const provinces = [...provinceCounts.entries()]
    .filter(([name, n]) => name !== "Other" && n >= minProvince)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  provinces.push("Other");
  const provinceIndex = (name) => {
    const i = provinces.indexOf(name);
    return i >= 0 ? i : provinces.length - 1;
  };

  const lineages = [];
  const lineageIndex = new Map();

  // Pass 2: rebuild from an allowlist. Internal nodes take the most common
  // group/province among their tips so branches can be coloured.
  function build(node, parentDate) {
    const rawDate = attr(node, "num_date");
    const date = typeof rawDate === "number" && Number.isFinite(rawDate) ? rawDate : parentDate;

    if (node.children?.length) {
      const d = round3(Math.max(date, parentDate));
      const children = node.children.map((c) => build(c, d));
      // Ladderize: smaller clades first, as Auspice does.
      children.sort((a, b) => a.tips - b.tips);
      const groupCounts = new Array(LINEAGE_GROUPS.length).fill(0);
      const provCounts = new Array(provinces.length).fill(0);
      for (const c of children) {
        c.groupCounts.forEach((n, i) => (groupCounts[i] += n));
        c.provCounts.forEach((n, i) => (provCounts[i] += n));
      }
      return {
        out: { d, g: argmax(groupCounts), p: argmax(provCounts), c: children.map((c) => c.out) },
        tips: children.reduce((s, c) => s + c.tips, 0),
        groupCounts,
        provCounts,
      };
    }

    const d = round3(Math.max(monthMidpoint(date), parentDate));
    const lineage = attr(node, "pangolin_lineage") ?? attr(node, "Nextclade_pango");
    const validLineage = typeof lineage === "string" && LINEAGE_RE.test(lineage) ? lineage : null;
    const g = lineageGroup(validLineage);
    const province = attr(node, "province");
    const p = provinceIndex(typeof province === "string" && province ? titleCase(province) : "Other");
    const out = { d, g, p };
    if (validLineage) {
      if (!lineageIndex.has(validLineage)) {
        lineageIndex.set(validLineage, lineages.length);
        lineages.push(validLineage);
      }
      out.l = lineageIndex.get(validLineage);
    }
    const groupCounts = new Array(LINEAGE_GROUPS.length).fill(0);
    const provCounts = new Array(provinces.length).fill(0);
    groupCounts[g] = 1;
    provCounts[p] = 1;
    return { out, tips: 1, groupCounts, provCounts };
  }

  const rootDate = attr(roots[0], "num_date");
  const tree = build(roots[0], typeof rootDate === "number" ? rootDate : -Infinity).out;

  return {
    result: {
      format: PHYLO_FORMAT,
      version: 1,
      generated,
      source: {
        title: typeof raw.meta?.title === "string" ? raw.meta.title : null,
        updated: typeof raw.meta?.updated === "string" ? raw.meta.updated : null,
      },
      groups: LINEAGE_GROUPS.map(({ id, label }) => ({ id, label })),
      provinces,
      lineages,
      tree,
    },
    unknownPrefixes: Object.fromEntries(unknownPrefixes),
  };
}

function main(argv) {
  const [input, output] = argv.filter((a) => !a.startsWith("--"));
  const minIdx = argv.indexOf("--min-province");
  const minProvince = minIdx >= 0 ? Number(argv[minIdx + 1]) : 20;
  if (!input || !output || !Number.isFinite(minProvince)) {
    console.error("Usage: node scripts/slim-auspice.mjs <auspice.json> <out.json> [--min-province 20]");
    process.exit(1);
  }
  const { result, unknownPrefixes } = slimAuspice(JSON.parse(readFileSync(input, "utf8")), { minProvince });
  writeFileSync(output, JSON.stringify(result));
  const size = (Buffer.byteLength(JSON.stringify(result)) / 1024).toFixed(0);
  // eslint-disable-next-line no-console -- CLI output
  console.log(`Wrote ${output} (${size} KB): ${result.lineages.length} lineages, provinces: ${result.provinces.join(", ")}`);
  if (Object.keys(unknownPrefixes).length) {
    console.warn("Unknown Pango prefixes (grouped as Other — add them to PANGO_ALIASES):", unknownPrefixes);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
