/**
 * Made-up results for the tour's "sample results" slide: one example per
 * service (DNA barcoding, assembly, metagenomics, transcriptomics). Nothing
 * here comes from a real sample. The numbers are generated from a fixed seed,
 * so the server and the browser draw the same figures.
 */

import type { TourText } from "@/lib/tour";

/** Mulberry32: a tiny seeded PRNG, uniform in [0, 1). */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draws (Box–Muller) from a uniform source. */
function normal(rand: () => number): () => number {
  return () => {
    let u = 0;
    while (!u) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (v: number, digits = 3) => Number(v.toFixed(digits));

export const SHOWCASE_IDS = ["barcoding", "assembly", "metagenomics", "transcriptomics"] as const;
export type ShowcaseId = (typeof SHOWCASE_IDS)[number];

export type ShowcaseCopy = { id: ShowcaseId; service: string; title: TourText; caption: TourText };

export const SHOWCASE_INTRO: TourText = {
  general: "Every project ends with a report full of figures like these. Here is one example per service, drawn from sample data.",
  students: "This is what our computers turn DNA into: trees, maps and charts. These examples use pretend data.",
  technical: "Representative report figures for each service, rendered from synthetic data.",
};

export const SHOWCASE_COPY: ShowcaseCopy[] = [
  {
    id: "barcoding",
    service: "DNA barcoding",
    title: { general: "Who is this specimen?", students: "What animal is this?", technical: "COI barcode identification" },
    caption: {
      general: "A short DNA barcode is matched against reference databases, then placed on a tree beside its closest relatives.",
      students: "We read a short DNA “barcode” and compare it with known species, like matching a fingerprint.",
      technical: "COI amplicon searched with BLASTn against reference libraries; a maximum-likelihood tree (1,000 bootstraps) confirms its placement.",
    },
  },
  {
    id: "assembly",
    service: "Sequence assembly",
    title: { general: "A complete genome, mapped", students: "Putting a genome together", technical: "De novo assembly and annotation" },
    caption: {
      general: "Sequencing reads are joined into one closed circular chromosome, then every gene is found and labelled.",
      students: "Millions of short DNA pieces are joined like a puzzle into one complete circle, then every gene gets a label.",
      technical: "Closed single-contig chromosome; rings show CDS by strand, rRNA and tRNA genes, GC content and GC skew.",
    },
  },
  {
    id: "metagenomics",
    service: "Metagenomics",
    title: { general: "Who lives in the water?", students: "Who lives in the water?", technical: "Shotgun metagenomic profiling" },
    caption: {
      general: "DNA from a whole sample reveals the microbes living in it, and how communities differ from site to site.",
      students: "From a scoop of seawater we can find the tiny microbes living in it, and compare different places.",
      technical: "Genus-level relative abundance across reef and mangrove sites; heatmap rows ordered by between-habitat difference.",
    },
  },
  {
    id: "transcriptomics",
    service: "Transcriptomics",
    title: { general: "Which genes switched on?", students: "Which genes switched on?", technical: "Differential expression (RNA-seq)" },
    caption: {
      general: "RNA sequencing compares gene activity between conditions and flags the genes that changed the most.",
      students: "We measure which genes are busy in a cell, and spot the ones that change when conditions change.",
      technical: "Treated vs control, n = 3 each; |log2FC| > 1 and adjusted p < 0.05; heatmap shows row z-scores of top DEGs.",
    },
  },
];

// --- DNA barcoding -----------------------------------------------------------

export type TreeNode = { name?: string; length: number; support?: number; query?: boolean; children?: TreeNode[] };

export const BARCODE_QUERY = { id: "PGCV-0421", marker: "COI", length: 652 };

export const BARCODE_TREE: TreeNode = {
  length: 0,
  children: [
    {
      length: 0.05,
      support: 100,
      children: [
        {
          length: 0.035,
          support: 97,
          children: [
            {
              length: 0.03,
              support: 100,
              children: [
                { name: `${BARCODE_QUERY.id} (query)`, length: 0.004, query: true },
                { name: "Thunnus albacares", length: 0.006 },
              ],
            },
            { name: "Thunnus obesus", length: 0.03 },
          ],
        },
        { name: "Thunnus tonggol", length: 0.06 },
      ],
    },
    {
      length: 0.06,
      support: 92,
      children: [
        { name: "Katsuwonus pelamis", length: 0.08 },
        { name: "Euthynnus affinis", length: 0.07 },
      ],
    },
    { name: "Scomberomorus commerson", length: 0.19 },
  ],
};

export type BlastHit = { species: string; identity: number; cover: number; evalue: string };

export const BLAST_HITS: BlastHit[] = [
  { species: "Thunnus albacares", identity: 99.8, cover: 100, evalue: "0.0" },
  { species: "Thunnus obesus", identity: 98.1, cover: 100, evalue: "0.0" },
  { species: "Thunnus tonggol", identity: 97.6, cover: 99, evalue: "0.0" },
  { species: "Katsuwonus pelamis", identity: 91.2, cover: 98, evalue: "2e-148" },
  { species: "Euthynnus affinis", identity: 90.4, cover: 98, evalue: "6e-141" },
];

// --- Sequence assembly ---------------------------------------------------------

export type GenomeFeature = { start: number; end: number; category: number };

export type GenomeMap = {
  length: number;
  gc: number;
  stats: { label: string; value: string }[];
  forward: GenomeFeature[];
  reverse: GenomeFeature[];
  rrna: number[];
  trna: number[];
  /** Per-window deviation from mean GC, roughly −1.5…1.5. */
  gcContent: number[];
  gcSkew: number[];
};

function makeGenome(): GenomeMap {
  const rand = seeded(17);
  const gauss = normal(rand);
  const length = 4_213_880;
  const strand = () => {
    const genes: GenomeFeature[] = [];
    for (let pos = rand() * 5000; pos < length; ) {
      const span = 4000 + rand() * 12000;
      genes.push({ start: Math.round(pos), end: Math.round(Math.min(length, pos + span * 0.75)), category: Math.floor(rand() * 5) });
      pos += span;
    }
    return genes;
  };
  const windows = 180;
  return {
    length,
    gc: 51.3,
    stats: [
      { label: "Genome size", value: "4,213,880 bp" },
      { label: "Contigs", value: "1 (circular)" },
      { label: "Coding genes", value: "3,982" },
      { label: "BUSCO complete", value: "99.2%" },
      { label: "tRNA genes", value: "78" },
      { label: "rRNA operons", value: "7" },
    ],
    forward: strand(),
    reverse: strand(),
    rrna: Array.from({ length: 7 }, (_, i) => Math.round((0.03 + i * 0.13 + rand() * 0.04) * length)),
    trna: Array.from({ length: 40 }, () => Math.round(rand() * length)),
    gcContent: Array.from({ length: windows }, () => round(clamp(gauss() * 0.6, -1.5, 1.5))),
    // Positive from the origin to the terminus, negative after: the usual bacterial pattern.
    gcSkew: Array.from({ length: windows }, (_, i) =>
      round(clamp((i < windows / 2 ? 1 : -1) * (0.5 + rand() * 0.5) + gauss() * 0.25, -1.5, 1.5)),
    ),
  };
}

export const GENOME_MAP = makeGenome();

// --- Metagenomics ----------------------------------------------------------------

export const META_TAXA = [
  "Prochlorococcus",
  "Synechococcus",
  "Pelagibacter",
  "Vibrio",
  "Alteromonas",
  "Pseudoalteromonas",
  "Flavobacterium",
  "Bacteroides",
  "Desulfovibrio",
  "Other",
] as const;

export type MetaSample = {
  id: string;
  habitat: "Reef" | "Mangrove";
  /** Percent per taxon, in META_TAXA order; sums to 100. */
  abundance: number[];
};

function makeSamples(): MetaSample[] {
  const rand = seeded(23);
  const typical = { Reef: [22, 14, 18, 4, 6, 3, 5, 2, 1, 12], Mangrove: [3, 4, 6, 16, 9, 7, 13, 11, 8, 14] };
  const habitats = ["Reef", "Reef", "Reef", "Mangrove", "Mangrove", "Mangrove"] as const;
  return habitats.map((habitat, i) => {
    const raw = typical[habitat].map((v) => v * (0.6 + 0.8 * rand()));
    const total = raw.reduce((a, b) => a + b, 0);
    return {
      id: `${habitat[0]}${(i % 3) + 1}`,
      habitat,
      abundance: raw.map((v) => round((v / total) * 100, 2)),
    };
  });
}

export const META_SAMPLES = makeSamples();

// --- Transcriptomics ---------------------------------------------------------------

export type VolcanoPoint = { fc: number; p: number; change: "up" | "down" | "none"; gene?: string };

export const FC_CUTOFF = 1;
/** −log10 of the 0.05 adjusted p cut-off. */
export const P_CUTOFF = round(-Math.log10(0.05), 2);

/** The named genes sit at fixed, well-spaced spots so their labels never collide. */
const LABELLED: VolcanoPoint[] = [
  { gene: "HSP70", fc: 3.6, p: 11.2, change: "up" },
  { gene: "GADD45A", fc: 2.3, p: 8.4, change: "up" },
  { gene: "HMOX1", fc: 3.1, p: 6.2, change: "up" },
  { gene: "COL1A1", fc: -3.3, p: 10.4, change: "down" },
  { gene: "PPARG", fc: -2.0, p: 7.6, change: "down" },
  { gene: "FABP4", fc: -3.9, p: 5.4, change: "down" },
];

function makeVolcano(): VolcanoPoint[] {
  const rand = seeded(31);
  const gauss = normal(rand);
  const points: VolcanoPoint[] = Array.from({ length: 600 }, () => {
    const fc = round(clamp(gauss() * 1.2, -4.8, 4.8), 2);
    // Kept below the labelled genes, so they stand out at the top.
    const p = round(Math.min(9.5, Math.pow(Math.abs(fc), 1.3) * (0.5 + rand() * 1.8) + rand() * 0.8), 2);
    const change = p > P_CUTOFF && fc > FC_CUTOFF ? "up" : p > P_CUTOFF && fc < -FC_CUTOFF ? "down" : "none";
    return { fc, p, change };
  });
  return [...points, ...LABELLED];
}

export const VOLCANO = makeVolcano();

export const DEG_SAMPLES = ["C1", "C2", "C3", "T1", "T2", "T3"];

export type DegRow = { gene: string; z: number[] };

function makeDegHeatmap(): DegRow[] {
  const rand = seeded(43);
  const gauss = normal(rand);
  const up = ["HSP70", "HSP90AA1", "GADD45A", "HMOX1", "SOD1", "CAT", "GPX1", "MT1"];
  const down = ["COL1A1", "ACTA1", "MYH7", "TNNT2", "PPARG", "FABP4", "LPL", "ADIPOQ"];
  return [...up, ...down].map((gene, i) => {
    const direction = i < up.length ? 1 : -1;
    const size = 1 + rand() * 0.6;
    return {
      gene,
      z: DEG_SAMPLES.map((_, j) => round(clamp((j < 3 ? -1 : 1) * direction * size + gauss() * 0.3, -2, 2), 2)),
    };
  });
}

export const DEG_HEATMAP = makeDegHeatmap();
