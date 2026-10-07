import { useId, useMemo } from "react";
import type { TourVirusMutation, VirusRole, VirusShape } from "@/lib/tour-virus";
import { CHAIN_COLORS, MARKER, ROLE_COLORS } from "./virus-colors";

/*
 * A flat SVG picture of the virus or the spike, for browsers without WebGL.
 * Both are projected from the same files as the 3D view, from a fixed angle,
 * and painted back to front.
 */

type P3 = [number, number, number];

/** Rotates about x, then y (degrees), so the picture is seen from a slight angle. */
function rotator(xDeg: number, yDeg: number) {
  const [ax, ay] = [(xDeg * Math.PI) / 180, (yDeg * Math.PI) / 180];
  const [cx, sx, cy, sy] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay)];
  return ([x, y, z]: P3): P3 => {
    const [y1, z1] = [y * cx - z * sx, y * sx + z * cx];
    // SVG y grows downwards.
    return [x * cy + z1 * sy, -y1, -x * sy + z1 * cy];
  };
}

function viewBox(points: { x: number; y: number; r: number }[], pad: number): string {
  const minX = Math.min(...points.map((p) => p.x - p.r)) - pad;
  const minY = Math.min(...points.map((p) => p.y - p.r)) - pad;
  const maxX = Math.max(...points.map((p) => p.x + p.r)) + pad;
  const maxY = Math.max(...points.map((p) => p.y + p.r)) + pad;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

const HIGHLIGHT: VirusRole[] = ["highlightLobe", "highlightStem"];

function VirusPicture({ scene, label, onOpenSpike }: { scene: VirusShape[]; label: string; onOpenSpike: () => void }) {
  const id = useId();
  const { items, box } = useMemo(() => {
    const turn = rotator(-18, 25);
    const items = scene
      .map((shape, i) => {
        if (shape.kind === "sphere") {
          const [x, y, z] = turn(shape.center);
          return { i, shape, x, y, z, r: shape.radius };
        }
        const [a, b] = [turn(shape.start), turn(shape.end)];
        return { i, shape, x: a[0], y: a[1], x2: b[0], y2: b[1], z: (a[2] + b[2]) / 2, r: shape.radius };
      })
      .sort((p, q) => p.z - q.z);
    return { items, box: viewBox(items, 40) };
  }, [scene]);

  return (
    <svg viewBox={box} role="img" aria-label={label} className="absolute inset-0 h-full w-full p-6">
      <defs>
        {(Object.keys(ROLE_COLORS) as VirusRole[]).map((role) => (
          <radialGradient key={role} id={`${id}-${role}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={role === "envelope" ? 0.35 : 0.55} />
            <stop offset="35%" stopColor={ROLE_COLORS[role]} />
            <stop offset="100%" stopColor="#0d1238" stopOpacity={0.85} />
          </radialGradient>
        ))}
      </defs>
      {items.map((item) => {
        const { shape } = item;
        const highlighted = HIGHLIGHT.includes(shape.role);
        const click = highlighted ? { onClick: onOpenSpike, className: "cursor-pointer" } : {};
        return shape.kind === "sphere" ? (
          <circle key={item.i} cx={item.x} cy={item.y} r={item.r} fill={`url(#${id}-${shape.role})`} {...click} />
        ) : (
          <line
            key={item.i}
            x1={item.x}
            y1={item.y}
            x2={"x2" in item ? item.x2 : item.x}
            y2={"y2" in item ? item.y2 : item.y}
            stroke={ROLE_COLORS[shape.role]}
            strokeWidth={item.r * 2}
            strokeLinecap="round"
            {...click}
          />
        );
      })}
    </svg>
  );
}

type CA = { chain: string; resi: number; p: P3 };

function parseCAs(pdb: string): CA[] {
  return pdb.split("\n").flatMap((line) => {
    if (!line.startsWith("ATOM  ") || line.slice(12, 16).trim() !== "CA") return [];
    const p = [line.slice(30, 38), line.slice(38, 46), line.slice(46, 54)].map(Number) as P3;
    return p.every(Number.isFinite) ? [{ chain: line.charAt(21), resi: Number(line.slice(22, 26)), p }] : [];
  });
}

function SpikePicture({
  pdb,
  marked,
  large,
  label,
}: {
  pdb: string;
  marked: TourVirusMutation[];
  large: boolean;
  label: string;
}) {
  const cas = useMemo(() => parseCAs(pdb), [pdb]);
  const { segments, box, turn } = useMemo(() => {
    const n = cas.length || 1;
    const c = [0, 1, 2].map((k) => cas.reduce((sum, a) => sum + a.p[k]!, 0) / n) as P3;
    const rotate = rotator(-95, -20);
    const turn = (p: P3) => rotate([p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
    const flat = cas.map((a) => ({ ...a, q: turn(a.p) }));
    const segments = flat
      .flatMap((a, i) => {
        const b = flat[i + 1];
        // Consecutive residues only, so unresolved loops stay gaps.
        return b && b.chain === a.chain && b.resi === a.resi + 1 ? [{ a: a.q, b: b.q, chain: a.chain, z: (a.q[2] + b.q[2]) / 2 }] : [];
      })
      .sort((s, t) => s.z - t.z);
    const box = viewBox(flat.map((a) => ({ x: a.q[0], y: a.q[1], r: 0 })), 12);
    return { segments, box, turn };
  }, [cas]);

  const zs = segments.map((s) => s.z);
  const [zMin, zMax] = [Math.min(...zs), Math.max(...zs)];
  const colorOf = new Map<string, string>(CHAIN_COLORS);
  const sites = marked.flatMap((m) =>
    cas.filter((a) => a.resi === m.position && m.chains.includes(a.chain)).map((a) => ({ key: `${m.name}-${a.chain}`, q: turn(a.p) })),
  );

  return (
    <svg viewBox={box} role="img" aria-label={label} className="absolute inset-0 h-full w-full p-6">
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.a[0]}
          y1={s.a[1]}
          x2={s.b[0]}
          y2={s.b[1]}
          stroke={colorOf.get(s.chain) ?? "#ffffff"}
          strokeOpacity={0.35 + (0.65 * (s.z - zMin)) / (zMax - zMin || 1)}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ))}
      {sites.map((site) => (
        <circle key={site.key} cx={site.q[0]} cy={site.q[1]} r={large ? 4.5 : 3} fill={MARKER} stroke="#ffffff" strokeWidth={0.8} />
      ))}
    </svg>
  );
}

export function VirusStill({
  view,
  scene,
  pdb,
  marked,
  large,
  label,
  onOpenSpike,
}: {
  view: "virus" | "spike";
  scene: VirusShape[];
  pdb: string | null;
  marked: TourVirusMutation[];
  large: boolean;
  label: string;
  onOpenSpike: () => void;
}) {
  if (view === "spike") return pdb ? <SpikePicture pdb={pdb} marked={marked} large={large} label={label} /> : null;
  return <VirusPicture scene={scene} label={label} onOpenSpike={onOpenSpike} />;
}
