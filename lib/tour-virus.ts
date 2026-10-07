/**
 * The 3D virus slide: files from the content repo's pgc-covid-exhibit/
 * folder (see its README). Everything is re-read through an allowlist, so
 * only the schematic shapes, the spike's atom coordinates and aggregate
 * mutation counts ever reach the browser.
 */

/** Repo-relative exhibit files we are willing to read from the content repo. */
export function isSafeTourVirusPath(path: string, ext: "json" | "pdb"): boolean {
  if (!path || path.length > 256 || path.includes("\\")) return false;
  const segments = path.split("/");
  if (segments[0] !== "pgc-covid-exhibit" || segments.length < 2) return false;
  if (!segments.every((s) => s.length > 0 && !s.startsWith("."))) return false;
  return path.toLowerCase().endsWith(`.${ext}`);
}

export type TourVirusMutation = {
  /** e.g. "D614G". */
  name: string;
  position: number;
  region: string | null;
  description: string | null;
  /** "2022-01". */
  firstMonth: string;
  /** Sequenced records carrying the substitution, across the whole dataset. */
  count: number;
  /** Spike chains in the structure where this residue was resolved. */
  chains: string[];
};

export type TourVirusSummary = {
  /** In order of first observation; same-month order is the exhibit's card order. */
  mutations: TourVirusMutation[];
  sampleCount: number | null;
  coverage: string | null;
  structure: { id: string; url: string | null; method: string | null; resolution: string | null };
};

export const SPIKE_CHAINS = ["A", "B", "C"] as const;

const MUTATION = /^[A-Z](\d{1,4})[A-Z]$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const optStr = (v: unknown, max = 400): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** The 12 featured spike substitutions from the exhibit's public-data.json, or null. */
export function parseTourVirusData(raw: unknown): TourVirusSummary | null {
  if (!isObj(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.mutations)) return null;
  const structure = isObj(raw.structure) ? raw.structure : {};
  const residueChains = isObj(structure.residueChains) ? structure.residueChains : {};

  const mutations = raw.mutations.flatMap((m): TourVirusMutation[] => {
    if (!isObj(m) || m.requiresReview) return [];
    const name = optStr(m.name, 8);
    const match = name ? MUTATION.exec(name) : null;
    const firstMonth = optStr(m.firstMonth, 7);
    if (!name || !match || !firstMonth || !MONTH.test(firstMonth)) return [];
    const position = Number(match[1]);
    const chains = residueChains[String(position)];
    return [
      {
        name,
        position,
        region: optStr(m.region, 80),
        description: optStr(m.description),
        firstMonth,
        count: typeof m.count === "number" && Number.isFinite(m.count) ? Math.max(0, Math.round(m.count)) : 0,
        chains: Array.isArray(chains)
          ? SPIKE_CHAINS.filter((c) => chains.includes(c))
          : [],
      },
    ];
  });
  if (!mutations.length) return null;
  // Array.sort is stable, so same-month cards keep the exhibit's order.
  mutations.sort((a, b) => a.firstMonth.localeCompare(b.firstMonth));

  const start = optStr(raw.coverageStart, 40);
  const end = optStr(raw.coverageEnd, 40);
  return {
    mutations: mutations.slice(0, 24),
    sampleCount: typeof raw.sampleCount === "number" ? raw.sampleCount : null,
    coverage: start && end ? `${start} – ${end}` : null,
    structure: {
      id: optStr(structure.id, 8) ?? "7KJ2",
      url: optStr(structure.url)?.startsWith("https://") ? optStr(structure.url) : null,
      method: optStr(structure.method, 40),
      resolution: optStr(structure.resolution, 20),
    },
  };
}

type Vec3 = [number, number, number];

export type VirusShape =
  | { kind: "sphere"; role: VirusRole; center: Vec3; radius: number }
  | { kind: "cylinder"; role: VirusRole; start: Vec3; end: Vec3; radius: number };

/** Colours are picked by role on the slide, not taken from the file. */
export type VirusRole = "envelope" | "stem" | "lobe" | "highlightStem" | "highlightLobe";

const MAX_SHAPES = 1000;

function vec3(v: unknown): Vec3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const n = v.map(Number);
  return n.every((x) => Number.isFinite(x) && Math.abs(x) < 1e5) ? (n as Vec3) : null;
}

/** The schematic virus (envelope plus spike stems and lobes) from virus-scene.json. */
export function parseVirusScene(raw: unknown): VirusShape[] | null {
  if (!isObj(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.shapes)) return null;
  const shapes = raw.shapes.slice(0, MAX_SHAPES).flatMap((s): VirusShape[] => {
    if (!isObj(s)) return [];
    const radius = Number(s.radius);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 5000) return [];
    if (s.kind === "sphere") {
      const center = vec3(s.center);
      if (!center) return [];
      const role: VirusRole = s.component === "lipid envelope" ? "envelope" : s.highlighted ? "highlightLobe" : "lobe";
      return [{ kind: "sphere", role, center, radius }];
    }
    if (s.kind === "cylinder") {
      const start = vec3(s.start);
      const end = vec3(s.end);
      if (!start || !end) return [];
      return [{ kind: "cylinder", role: s.highlighted ? "highlightStem" : "stem", start, end, radius }];
    }
    return [];
  });
  return shapes.length ? shapes : null;
}

const MAX_PDB_BYTES = 4_000_000;

/** Only the spike chains' ATOM records of the PDB file, or null. */
export function slimSpikePdb(raw: string): string | null {
  if (raw.length > MAX_PDB_BYTES) return null;
  const lines = raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith("ATOM  ") && (SPIKE_CHAINS as readonly string[]).includes(line.charAt(21)));
  return lines.length ? `${lines.join("\n")}\nEND\n` : null;
}
