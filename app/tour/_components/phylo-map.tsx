"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TOUR_MAP } from "@/lib/tour-map-shapes";

/** Largest bubble radius, in map units (the map is TOUR_MAP.width wide). */
const MAX_R = 54;
/** Labels that would sit on a neighbour's bubble are nudged (map units). */
const LABEL_SIDE: Record<string, "left" | "right"> = { Antique: "left", Aklan: "left", "Negros Occidental": "left" };

function at<T>(list: ArrayLike<T>, i: number): T {
  return list[i] as T;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Eases a number towards `target`, so counts and bubbles grow between months. */
function useTweened(target: number, ms: number): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const duration = prefersReducedMotion() ? 0 : ms;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      const v = from + (target - from) * (1 - (1 - k) ** 3);
      current.current = v;
      setValue(v);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function pieSlices(cx: number, cy: number, r: number, values: number[]): { d: string; k: number }[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0 || r <= 0) return [];
  const out: { d: string; k: number }[] = [];
  let angle = -Math.PI / 2;
  values.forEach((v, k) => {
    if (v <= 0) return;
    const sweep = (v / total) * Math.PI * 2;
    if (sweep >= Math.PI * 2 - 1e-6) {
      out.push({ d: `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`, k });
    } else {
      const x0 = cx + r * Math.cos(angle);
      const y0 = cy + r * Math.sin(angle);
      const x1 = cx + r * Math.cos(angle + sweep);
      const y1 = cy + r * Math.sin(angle + sweep);
      out.push({ d: `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x1},${y1}Z`, k });
    }
    angle += sweep;
  });
  return out;
}

export type PhyloMapProps = {
  /** Running totals from cumulativeCounts(); one row per month. */
  cumulative: Uint32Array[];
  /** Month currently shown; fractional values are blended between months. */
  monthIndex: number;
  monthLabel: string;
  tweenMs: number;
  provinces: string[];
  groupLabels: string[];
  colorBy: "group" | "province";
  colors: string[];
  /** Province of the tree tip under the pointer, outlined on the map. */
  tipProvince: number | null;
  onFocusProvince: (province: number | null) => void;
};

/**
 * Nextstrain-style map: one pie per province at its centre, sized by the
 * genomes sampled so far and split by the current colouring. Bubbles are
 * scaled against the final totals, so they grow as playback runs.
 */
export function PhyloMap({
  cumulative,
  monthIndex,
  monthLabel,
  tweenMs,
  provinces,
  groupLabels,
  colorBy,
  colors,
  tipProvince,
  onFocusProvince,
}: PhyloMapProps) {
  const t = useTweened(monthIndex, tweenMs);
  const G = groupLabels.length;
  const last = cumulative.length - 1;

  // Counts at time t, blended between the two neighbouring months.
  const live = useMemo(() => {
    const lo = Math.max(0, Math.min(last, Math.floor(t)));
    const hi = Math.min(last, lo + 1);
    const w = Math.max(0, Math.min(1, t - lo));
    const a = at(cumulative, lo);
    const b = at(cumulative, hi);
    return Array.from(a, (v, k) => v + (at(b, k) - v) * w);
  }, [cumulative, t, last]);

  const provinceIndex = useMemo(() => new Map(provinces.map((name, i) => [name, i])), [provinces]);
  const byProvince = (p: number) => live.slice(p * G, (p + 1) * G);
  const provinceTotal = (p: number) => byProvince(p).reduce((a, b) => a + b, 0);

  // Bubble scale: the largest province at the end of the series has MAX_R.
  const peak = useMemo(() => {
    const final = at(cumulative, last);
    let best = 1;
    TOUR_MAP.provinces.forEach((shape) => {
      const p = provinceIndex.get(shape.name);
      if (p === undefined) return;
      let sum = 0;
      for (let g = 0; g < G; g++) sum += at(final, p * G + g);
      best = Math.max(best, sum);
    });
    return best;
  }, [cumulative, last, provinceIndex, G]);

  const bubbles = TOUR_MAP.provinces
    .map((shape) => {
      const p = provinceIndex.get(shape.name);
      const total = p === undefined ? 0 : provinceTotal(p);
      return { shape, p, total, r: MAX_R * Math.sqrt(total / peak) };
    })
    .sort((a, b) => b.r - a.r);

  const total = live.reduce((a, b) => a + b, 0);
  const other = provinceIndex.has("Other") ? provinceTotal(provinceIndex.get("Other")!) : 0;
  const onMap = TOUR_MAP.provinces.some((s) => s.name === "Other") ? 0 : other;

  const [hover, setHover] = useState<{ p: number; x: number; y: number; right: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const focus = (p: number | undefined, event: React.PointerEvent) => {
    if (p === undefined || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    // Present mode may zoom the slide: convert screen pixels back to the box's own.
    const scale = rect.width / (box.current.offsetWidth || rect.width);
    const x = (event.clientX - rect.left) / scale;
    setHover({ p, x, y: (event.clientY - rect.top) / scale, right: x > box.current.offsetWidth * 0.55 });
    if (hover?.p !== p) onFocusProvince(p);
  };
  const blur = () => {
    setHover(null);
    onFocusProvince(null);
  };

  const highlighted = hover?.p ?? tipProvince;
  const categories = colorBy === "group" ? groupLabels : provinces;
  const categoryTotals =
    colorBy === "group"
      ? groupLabels.map((_, g) => provinces.reduce((s, _p, p) => s + at(live, p * G + g), 0))
      : provinces.map((_, p) => provinceTotal(p));

  return (
    <div className="flex h-full flex-col">
      {/* Live readout */}
      <div className="flex items-baseline justify-between gap-3" aria-live="off">
        <span className="text-sm font-bold text-[#2a7797]">{monthLabel}</span>
        <span className="text-right">
          <span className="text-3xl font-black tabular-nums text-[#2b3278]">{Math.round(total).toLocaleString("en-PH")}</span>
          <span className="ml-1.5 text-sm font-semibold text-[#5b6770]">genomes</span>
        </span>
      </div>

      {/* Map */}
      <div
        ref={box}
        className="relative mt-2 h-[340px] min-h-0 md:h-[400px] lg:h-auto lg:flex-1"
        onPointerLeave={blur}
      >
        <svg
          viewBox={`0 0 ${TOUR_MAP.width} ${TOUR_MAP.height}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Map of Western Visayas: ${bubbles
            .filter((b) => b.total >= 0.5)
            .map((b) => `${b.shape.name} ${Math.round(b.total).toLocaleString("en-PH")}`)
            .join(", ")} genomes by ${monthLabel}.`}
        >
          {TOUR_MAP.provinces.map((shape) => {
            const p = provinceIndex.get(shape.name);
            const active = p !== undefined && p === highlighted;
            return (
              <path
                key={shape.name}
                d={shape.path}
                fill={active ? "#e3d3e6" : "#efeaf3"}
                stroke={active ? "#5e205e" : "#ffffff"}
                strokeWidth={active ? 1.6 : 1}
                strokeLinejoin="round"
                onPointerMove={(e) => focus(p, e)}
              />
            );
          })}
          {bubbles.map(({ shape, p, r }) =>
            p === undefined || r < 0.5 ? null : (
              <g key={shape.name} onPointerMove={(e) => focus(p, e)} className="cursor-default">
                {colorBy === "group" ? (
                  pieSlices(shape.anchor[0], shape.anchor[1], r, byProvince(p)).map((s) => (
                    <path key={s.k} d={s.d} fill={at(colors, s.k)} fillOpacity={0.88} />
                  ))
                ) : (
                  <circle cx={shape.anchor[0]} cy={shape.anchor[1]} r={r} fill={at(colors, p)} fillOpacity={0.88} />
                )}
                <circle
                  cx={shape.anchor[0]}
                  cy={shape.anchor[1]}
                  r={r}
                  fill="none"
                  stroke={p === highlighted ? "#1c2152" : "#ffffff"}
                  strokeWidth={p === highlighted ? 2 : 1.2}
                />
              </g>
            ),
          )}
          {bubbles.map(({ shape, total, r }) => {
            const side = LABEL_SIDE[shape.name] ?? "right";
            const x = shape.anchor[0] + (side === "right" ? 1 : -1) * (Math.max(r, 3) + 5);
            return (
              <text
                key={shape.name}
                x={x}
                y={shape.anchor[1]}
                textAnchor={side === "right" ? "start" : "end"}
                dominantBaseline="middle"
                className="pointer-events-none select-none"
                fill={total >= 0.5 ? "#2b3278" : "#9a96a8"}
                stroke="#ffffff"
                strokeWidth={3}
                paintOrder="stroke"
                strokeLinejoin="round"
                fontSize={15}
              >
                <tspan fontWeight={700}>{shape.name}</tspan>
                {total >= 0.5 && (
                  <tspan x={x} dy={17} fontWeight={600} fill="#5b6770">
                    {Math.round(total).toLocaleString("en-PH")}
                  </tspan>
                )}
              </text>
            );
          })}
        </svg>
        {hover && (
          <ProvinceTooltip
            x={hover.x}
            y={hover.y}
            right={hover.right}
            name={at(provinces, hover.p)}
            rows={
              colorBy === "group"
                ? groupLabels
                    .map((label, g) => ({ label, color: at(colors, g), value: Math.round(at(live, hover.p * G + g)) }))
                    .filter((r) => r.value > 0)
                : []
            }
            total={Math.round(provinceTotal(hover.p))}
          />
        )}
      </div>
      {onMap >= 0.5 && (
        <p className="mt-1 text-xs text-[#5b6770]">
          + {Math.round(onMap).toLocaleString("en-PH")} from other or unrecorded provinces
        </p>
      )}

      {/* Legend with live counts — identity never relies on colour alone */}
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-[#2b3278]/10 pt-3 text-[13px]">
        {categories.map((label, k) => {
          const count = Math.round(at(categoryTotals, k));
          const final = colorBy === "group" ? sumGroup(at(cumulative, last), provinces.length, G, k) : sumProvince(at(cumulative, last), G, k);
          if (final === 0) return null;
          return (
            <li key={label} className={`flex items-center gap-2 transition-opacity ${count === 0 ? "opacity-40" : ""}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: at(colors, k) }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium text-[#333333]" title={label}>{label}</span>
              <span className="tabular-nums text-[#5b6770]">{count.toLocaleString("en-PH")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function sumGroup(row: Uint32Array, provinceCount: number, G: number, g: number): number {
  let s = 0;
  for (let p = 0; p < provinceCount; p++) s += at(row, p * G + g);
  return s;
}

function sumProvince(row: Uint32Array, G: number, p: number): number {
  let s = 0;
  for (let g = 0; g < G; g++) s += at(row, p * G + g);
  return s;
}

function ProvinceTooltip({
  x,
  y,
  right,
  name,
  rows,
  total,
}: {
  x: number;
  y: number;
  right: boolean;
  name: string;
  rows: { label: string; color: string; value: number }[];
  total: number;
}) {
  return (
    <span
      className={`pointer-events-none absolute z-10 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1c2152] px-3 py-2 text-xs text-white shadow-lg ${
        right ? "-translate-x-full -ml-4" : "ml-4"
      }`}
      style={{ left: x, top: y }}
      aria-hidden="true"
    >
      <span className="block text-sm font-black">{name}</span>
      <span className="block text-white/70">{total.toLocaleString("en-PH")} genomes so far</span>
      {rows.map((r) => (
        <span key={r.label} className="mt-0.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
          <span className="flex-1">{r.label}</span>
          <span className="font-bold tabular-nums">{r.value.toLocaleString("en-PH")}</span>
        </span>
      ))}
    </span>
  );
}
