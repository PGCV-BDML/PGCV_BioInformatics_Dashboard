/**
 * Small report-style figures for the "sample results" slide, one pair per
 * service. All data comes from lib/tour-showcase.ts and is made up.
 */
import {
  BARCODE_QUERY,
  BARCODE_TREE,
  BLAST_HITS,
  DEG_HEATMAP,
  DEG_SAMPLES,
  FC_CUTOFF,
  GENOME_MAP,
  META_SAMPLES,
  META_TAXA,
  P_CUTOFF,
  VOLCANO,
  type ShowcaseId,
  type TreeNode,
} from "@/lib/tour-showcase";
import { BRAND, LOGO } from "./brand";

const INK = "#333333";
const MUTED = "#5b6770";
const RULE = "#8a8f99";
const GRID = "#eceaf1";

/** Linear blend through a list of #rrggbb stops, t in [0, 1]. */
function blend(stops: string[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const rgb = (hex: string) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const a = rgb(stops[i] ?? "#000000");
  const b = rgb(stops[i + 1] ?? "#000000");
  return `rgb(${a.map((v, k) => Math.round(v + ((b[k] ?? v) - v) * f)).join(",")})`;
}

function Figure({ label, viewBox, children }: { label: string; viewBox: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className="block h-auto w-full" fontSize={11}>
      {children}
    </svg>
  );
}

function FigureTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold text-[#2b3278]">{children}</p>;
}

// --- DNA barcoding ---------------------------------------------------------------

type PlacedNode = TreeNode & { x: number; y: number; placed?: PlacedNode[] };

function placeTree(node: TreeNode, parentX: number, leaves: { count: number }): PlacedNode {
  const x = parentX + node.length;
  if (!node.children) return { ...node, x, y: leaves.count++ };
  const placed = node.children.map((child) => placeTree(child, x, leaves));
  const ys = placed.map((p) => p.y);
  return { ...node, x, y: (Math.min(...ys) + Math.max(...ys)) / 2, placed };
}

function BarcodeTree() {
  const leaves = { count: 0 };
  const root = placeTree(BARCODE_TREE, 0, leaves);
  let depth = 0;
  const walk = (n: PlacedNode) => {
    depth = Math.max(depth, n.x);
    n.placed?.forEach(walk);
  };
  walk(root);
  const scale = 120 / depth;
  const X = (v: number) => 18 + v * scale;
  const Y = (i: number) => 14 + i * 24;
  const scaleY = Y(leaves.count - 1) + 26;

  const draw = (n: PlacedNode, key: string): React.ReactNode[] => {
    if (!n.placed) {
      return [
        n.query ? <circle key={`${key}d`} cx={X(n.x)} cy={Y(n.y)} r={4} fill={BRAND.teal} /> : null,
        <text
          key={`${key}t`}
          x={X(n.x) + 7}
          y={Y(n.y) + 4}
          fill={n.query ? BRAND.tealInk : INK}
          fontStyle={n.query ? undefined : "italic"}
          fontWeight={n.query ? 700 : undefined}
        >
          {n.name}
        </text>,
      ];
    }
    const ys = n.placed.map((child) => child.y);
    return [
      <line key={`${key}v`} x1={X(n.x)} y1={Y(Math.min(...ys))} x2={X(n.x)} y2={Y(Math.max(...ys))} stroke={RULE} strokeWidth={1.2} />,
      ...n.placed.flatMap((child, i) => [
        <line key={`${key}h${i}`} x1={X(n.x)} y1={Y(child.y)} x2={X(child.x)} y2={Y(child.y)} stroke={RULE} strokeWidth={1.2} />,
        ...draw(child, `${key}.${i}`),
      ]),
      n.support ? (
        <text key={`${key}s`} x={X(n.x) - 3} y={Y(n.y) - 4} textAnchor="end" fill={MUTED}>
          {n.support}
        </text>
      ) : null,
    ];
  };

  return (
    <Figure label="Phylogenetic tree placing the query sample beside Thunnus albacares" viewBox={`0 0 320 ${scaleY + 8}`}>
      <line x1={6} y1={Y(root.y)} x2={X(0)} y2={Y(root.y)} stroke={RULE} strokeWidth={1.2} />
      {draw(root, "n")}
      <line x1={18} y1={scaleY} x2={18 + 0.05 * scale} y2={scaleY} stroke={INK} strokeWidth={1.2} />
      <text x={18 + 0.05 * scale + 6} y={scaleY + 4} fill={MUTED}>
        0.05 substitutions/site
      </text>
    </Figure>
  );
}

function BlastTable() {
  const [top] = BLAST_HITS;
  return (
    <div>
      <p className="mb-2 text-[11px] text-[#5b6770]">
        Query {BARCODE_QUERY.id} · {BARCODE_QUERY.marker} · {BARCODE_QUERY.length} bp
      </p>
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#2b3278]/10 text-left text-[#5b6770]">
            <th className="w-[44%] py-1 pr-1 font-semibold">Hit</th>
            <th className="py-1 pr-1 font-semibold">Identity</th>
            <th className="py-1 pr-1 font-semibold">Cover</th>
            <th className="py-1 font-semibold">E-value</th>
          </tr>
        </thead>
        <tbody>
          {BLAST_HITS.map((hit, i) => (
            <tr key={hit.species} className={`border-b border-[#2b3278]/5 ${i === 0 ? "bg-[#12ca99]/10" : ""}`}>
              <td className={`truncate py-1.5 pr-1 italic ${i === 0 ? "font-semibold text-[#0a7558]" : ""}`}>{hit.species}</td>
              <td className="py-1.5 pr-1 tabular-nums">{hit.identity.toFixed(1)}%</td>
              <td className="py-1.5 pr-1 tabular-nums">{hit.cover}%</td>
              <td className="py-1.5 tabular-nums">{hit.evalue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[#0a7558]">
        <span className="font-semibold">Best match:</span> <span className="italic">{top?.species}</span> (yellowfin tuna),{" "}
        {top?.identity}% identity
      </p>
    </div>
  );
}

// --- Sequence assembly ---------------------------------------------------------------

const COG_COLORS = [BRAND.navy, BRAND.deepTeal, BRAND.teal, "#6cc4e6", BRAND.purple];

function GenomeRing() {
  const { length, gc, forward, reverse, rrna, trna, gcContent, gcSkew } = GENOME_MAP;
  const c = 150;
  const angle = (pos: number) => (pos / length) * 2 * Math.PI - Math.PI / 2;
  const at = (r: number, a: number) => `${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`;
  const arc = (r0: number, r1: number, p0: number, p1: number) => {
    const a0 = angle(p0);
    const a1 = angle(p1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${at(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${at(r1, a1)}L${at(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${at(r0, a0)}Z`;
  };
  const windowArc = (values: number[], base: number, scale: number, up: string, down: string, key: string) =>
    values.map((v, i) => {
      const r = base + v * scale;
      return (
        <path
          key={`${key}${i}`}
          d={arc(Math.min(base, r), Math.max(base, r), (i / values.length) * length, ((i + 1) / values.length) * length)}
          fill={v > 0 ? up : down}
        />
      );
    });
  const ticks = Array.from({ length: Math.ceil(length / 250_000) }, (_, i) => i * 250_000);

  return (
    <Figure label={`Circular genome map, ${(length / 1e6).toFixed(2)} Mb`} viewBox="0 0 300 300">
      <circle cx={c} cy={c} r={118} fill="none" stroke={BRAND.navy} strokeWidth={1.5} />
      {ticks.map((pos) => {
        const a = angle(pos);
        const major = pos % 1_000_000 === 0;
        const lx = c + 136 * Math.cos(a);
        const ly = c + 136 * Math.sin(a);
        return (
          <g key={pos}>
            <path d={`M${at(118, a)}L${at(major ? 125 : 122, a)}`} stroke={BRAND.navy} strokeWidth={1} />
            {major && (
              <text x={lx} y={ly + 4} textAnchor="middle" fill={MUTED}>
                {pos / 1e6} Mb
              </text>
            )}
          </g>
        );
      })}
      {forward.map((g, i) => (
        <path key={`f${i}`} d={arc(104, 114, g.start, g.end)} fill={COG_COLORS[g.category]} />
      ))}
      {reverse.map((g, i) => (
        <path key={`r${i}`} d={arc(92, 102, g.start, g.end)} fill={COG_COLORS[g.category]} />
      ))}
      {trna.map((pos, i) => (
        <path key={`t${i}`} d={arc(82, 87, pos, pos + 5000)} fill={LOGO.orange} />
      ))}
      {rrna.map((pos, i) => (
        <path key={`rr${i}`} d={arc(80, 90, pos, pos + 12000)} fill={LOGO.red} />
      ))}
      {windowArc(gcContent, 66, 7, BRAND.deepTeal, "#d7a6d7", "gc")}
      {windowArc(gcSkew, 41, 7, BRAND.teal, BRAND.purple, "sk")}
      <text x={c} y={c - 1} textAnchor="middle" fontSize={13} fontWeight={800} fill={BRAND.navy}>
        {(length / 1e6).toFixed(2)} Mb
      </text>
      <text x={c} y={c + 13} textAnchor="middle" fill={MUTED}>
        GC {gc}%
      </text>
    </Figure>
  );
}

const GENOME_LEGEND = [
  [BRAND.navy, "Genes, outer = forward"],
  [LOGO.red, "rRNA operons"],
  [LOGO.orange, "tRNA genes"],
  [BRAND.deepTeal, "GC content"],
  [BRAND.teal, "GC skew +"],
  [BRAND.purple, "GC skew −"],
] as const;

function AssemblyStats() {
  return (
    <div>
      <dl className="grid grid-cols-2 gap-2">
        {GENOME_MAP.stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse rounded-lg bg-[#f7f6fa] px-3 py-2">
            <dt className="text-[11px] text-[#5b6770]">{stat.label}</dt>
            <dd className="text-sm font-bold text-[#2b3278]">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#5b6770]">
        {GENOME_LEGEND.map(([color, label]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Metagenomics -----------------------------------------------------------------------

const TAXON_COLORS = [
  BRAND.navy,
  BRAND.deepTeal,
  BRAND.teal,
  "#6cc4e6",
  BRAND.purple,
  "#d7a6d7",
  LOGO.orange,
  LOGO.red,
  LOGO.magenta,
  "#c9ccd6",
];

/** Labels under each habitat's group of columns. */
function habitatGroups() {
  return META_SAMPLES.reduce<{ habitat: string; first: number; last: number }[]>((groups, s, i) => {
    const prev = groups[groups.length - 1];
    if (prev?.habitat === s.habitat) prev.last = i;
    else groups.push({ habitat: s.habitat, first: i, last: i });
    return groups;
  }, []);
}

function TaxaBars() {
  const top = 10;
  const h = 168;
  const Y = (pct: number) => top + h - (pct / 100) * h;
  const step = 25;
  return (
    <Figure label="Stacked bar chart of genus abundance in reef and mangrove samples" viewBox="0 0 320 214">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={32} y1={Y(v)} x2={190} y2={Y(v)} stroke={GRID} />
          <text x={28} y={Y(v) + 4} textAnchor="end" fill={MUTED}>
            {v}%
          </text>
        </g>
      ))}
      {META_SAMPLES.map((sample, j) => {
        const x = 40 + j * step;
        let acc = 0;
        return (
          <g key={sample.id}>
            {sample.abundance.map((pct, i) => {
              const y = Y(acc + pct);
              acc += pct;
              return <rect key={META_TAXA[i]} x={x} y={y} width={19} height={(pct / 100) * h} fill={TAXON_COLORS[i]} />;
            })}
            <text x={x + 9.5} y={top + h + 14} textAnchor="middle" fill={MUTED}>
              {sample.id}
            </text>
          </g>
        );
      })}
      {habitatGroups().map((g) => (
        <text key={g.habitat} x={40 + ((g.first + g.last) / 2) * step + 9.5} y={top + h + 30} textAnchor="middle" fill={INK}>
          {g.habitat}
        </text>
      ))}
      {META_TAXA.map((name, i) => (
        <g key={name}>
          <rect x={198} y={6 + i * 17} width={9} height={9} rx={1.5} fill={TAXON_COLORS[i]} />
          <text x={212} y={14 + i * 17} fill={INK} fontStyle={name === "Other" ? undefined : "italic"}>
            {name}
          </text>
        </g>
      ))}
    </Figure>
  );
}

const ABUNDANCE_STOPS = ["#f4f6fb", "#6cc4e6", BRAND.deepTeal, "#1c2152"];
const HABITAT_COLORS: Record<string, string> = { Reef: BRAND.teal, Mangrove: BRAND.purple };

function AbundanceHeatmap() {
  const lo = Math.log10(0.5);
  const hi = Math.log10(30);
  const shade = (pct: number) => blend(ABUNDANCE_STOPS, (Math.log10(Math.max(pct, 0.3)) - lo) / (hi - lo));
  const reefMinusMangrove = (i: number) =>
    META_SAMPLES.reduce((sum, s) => sum + (s.habitat === "Reef" ? 1 : -1) * (s.abundance[i] ?? 0), 0);
  const rows = META_TAXA.map((name, i) => ({ name, i }))
    .filter((r) => r.name !== "Other")
    .sort((a, b) => reefMinusMangrove(b.i) - reefMinusMangrove(a.i));
  const x0 = 118;
  const cw = 30;
  const ch = 16;
  const y0 = 34;
  const keyY = y0 + rows.length * ch + 12;
  return (
    <Figure label="Heatmap of genus abundance, reef genera on top and mangrove genera below" viewBox={`0 0 320 ${keyY + 14}`}>
      {META_SAMPLES.map((s, j) => (
        <g key={s.id}>
          <rect x={x0 + j * cw} y={4} width={cw - 2} height={6} fill={HABITAT_COLORS[s.habitat]} />
          <text x={x0 + j * cw + cw / 2} y={26} textAnchor="middle" fill={MUTED}>
            {s.id}
          </text>
        </g>
      ))}
      {rows.map((r, k) => (
        <g key={r.name}>
          <text x={x0 - 6} y={y0 + k * ch + ch / 2 + 3} textAnchor="end" fill={INK} fontStyle="italic">
            {r.name}
          </text>
          {META_SAMPLES.map((s, j) => {
            const pct = s.abundance[r.i] ?? 0;
            return (
              <rect key={s.id} x={x0 + j * cw} y={y0 + k * ch} width={cw - 2} height={ch - 2} fill={shade(pct)}>
                <title>{`${r.name}, ${s.id}: ${pct.toFixed(1)}%`}</title>
              </rect>
            );
          })}
        </g>
      ))}
      {Array.from({ length: 6 }, (_, k) => (
        <rect key={k} x={x0 + k * 20} y={keyY} width={20} height={8} fill={blend(ABUNDANCE_STOPS, k / 5)} />
      ))}
      <text x={x0 - 6} y={keyY + 8} textAnchor="end" fill={MUTED}>
        0.5%
      </text>
      <text x={x0 + 126} y={keyY + 8} fill={MUTED}>
        30%
      </text>
    </Figure>
  );
}

// --- Transcriptomics --------------------------------------------------------------------

const CHANGE_COLORS = { up: LOGO.red, down: LOGO.blue, none: "#c9ccd6" };

function Volcano() {
  const X = (fc: number) => 40 + ((fc + 5) / 10) * 268;
  const Y = (p: number) => 196 - (p / 14) * 184;
  const up = VOLCANO.filter((p) => p.change === "up").length;
  const down = VOLCANO.filter((p) => p.change === "down").length;
  // Unchanged genes first, so the coloured ones sit on top.
  const ordered = [...VOLCANO].sort((a, b) => Number(a.change !== "none") - Number(b.change !== "none"));
  return (
    <Figure label={`Volcano plot: ${up} genes up, ${down} genes down`} viewBox="0 0 320 232">
      {[0, 4, 8, 12].map((v) => (
        <text key={v} x={34} y={Y(v) + 4} textAnchor="end" fill={MUTED}>
          {v}
        </text>
      ))}
      {[-4, -2, 0, 2, 4].map((v) => (
        <text key={v} x={X(v)} y={210} textAnchor="middle" fill={MUTED}>
          {v}
        </text>
      ))}
      <path d="M40 12V196H308" fill="none" stroke={RULE} />
      <g stroke={RULE} strokeDasharray="3 3">
        <line x1={X(-FC_CUTOFF)} y1={12} x2={X(-FC_CUTOFF)} y2={196} />
        <line x1={X(FC_CUTOFF)} y1={12} x2={X(FC_CUTOFF)} y2={196} />
        <line x1={40} y1={Y(P_CUTOFF)} x2={308} y2={Y(P_CUTOFF)} />
      </g>
      {ordered.map((pt, i) => (
        <circle
          key={i}
          cx={X(pt.fc).toFixed(1)}
          cy={Y(pt.p).toFixed(1)}
          r={2.2}
          fill={CHANGE_COLORS[pt.change]}
          fillOpacity={pt.change === "none" ? 0.6 : 0.85}
        />
      ))}
      {VOLCANO.filter((pt) => pt.gene).map((pt) => (
        <text
          key={pt.gene}
          x={X(pt.fc) + (pt.change === "up" ? 5 : -5)}
          y={Y(pt.p) + 4}
          textAnchor={pt.change === "up" ? "start" : "end"}
          fontStyle="italic"
          fill={INK}
        >
          {pt.gene}
        </text>
      ))}
      <text x={46} y={24} fontWeight={700} fill={LOGO.blue}>
        Down {down}
      </text>
      <text x={302} y={24} textAnchor="end" fontWeight={700} fill={LOGO.red}>
        Up {up}
      </text>
      <text x={174} y={226} textAnchor="middle" fill={MUTED}>
        log2 fold change
      </text>
      <text x={12} y={104} textAnchor="middle" fill={MUTED} transform="rotate(-90 12 104)">
        −log10 adjusted p
      </text>
    </Figure>
  );
}

const Z_STOPS = [LOGO.blue, "#ffffff", LOGO.red];

function DegHeatmap() {
  const x0 = 96;
  const cw = 32;
  const ch = 12;
  const y0 = 34;
  const keyY = y0 + DEG_HEATMAP.length * ch + 12;
  return (
    <Figure label="Heatmap of the top differentially expressed genes, control versus treated" viewBox={`0 0 320 ${keyY + 14}`}>
      <rect x={x0} y={4} width={cw * 3 - 2} height={6} fill="#9aa0ab" />
      <rect x={x0 + cw * 3} y={4} width={cw * 3 - 2} height={6} fill={BRAND.navy} />
      <text x={x0 + cw * 1.5} y={26} textAnchor="middle" fill={MUTED}>
        Control
      </text>
      <text x={x0 + cw * 4.5} y={26} textAnchor="middle" fill={MUTED}>
        Treated
      </text>
      {DEG_HEATMAP.map((row, i) => (
        <g key={row.gene}>
          <text x={x0 - 6} y={y0 + i * ch + ch / 2 + 3} textAnchor="end" fontStyle="italic" fill={INK}>
            {row.gene}
          </text>
          {row.z.map((z, j) => (
            <rect key={j} x={x0 + j * cw} y={y0 + i * ch} width={cw - 2} height={ch - 1.5} fill={blend(Z_STOPS, (z + 2) / 4)}>
              <title>{`${row.gene}, ${DEG_SAMPLES[j]}: z = ${z}`}</title>
            </rect>
          ))}
        </g>
      ))}
      {Array.from({ length: 7 }, (_, k) => (
        <rect key={k} x={x0 + k * 18} y={keyY} width={18} height={8} fill={blend(Z_STOPS, k / 6)} />
      ))}
      <text x={x0 - 6} y={keyY + 8} textAnchor="end" fill={MUTED}>
        −2
      </text>
      <text x={x0 + 132} y={keyY + 8} fill={MUTED}>
        +2 z-score
      </text>
    </Figure>
  );
}

// --- Per-service pairs ---------------------------------------------------------------------

const FIGURES: Record<ShowcaseId, [string, React.ReactNode, string, React.ReactNode]> = {
  barcoding: ["Phylogenetic tree (COI)", <BarcodeTree key="a" />, "BLAST top hits", <BlastTable key="b" />],
  assembly: ["Circular genome map", <GenomeRing key="a" />, "Assembly and annotation", <AssemblyStats key="b" />],
  metagenomics: ["Taxonomic composition", <TaxaBars key="a" />, "Relative abundance", <AbundanceHeatmap key="b" />],
  transcriptomics: ["Volcano plot", <Volcano key="a" />, "Top differentially expressed genes", <DegHeatmap key="b" />],
};

export function ShowcaseFigures({ id }: { id: ShowcaseId }) {
  const [titleA, figureA, titleB, figureB] = FIGURES[id];
  return (
    // Stacked, and capped in width so the 11px chart text stays near its drawn size.
    <div className="flex flex-col gap-5">
      <div className="mx-auto w-full max-w-[400px]">
        <FigureTitle>{titleA}</FigureTitle>
        {figureA}
      </div>
      <div className="mx-auto w-full max-w-[400px]">
        <FigureTitle>{titleB}</FigureTitle>
        {figureB}
      </div>
    </div>
  );
}
