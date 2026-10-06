"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  formatMonth,
  layoutPhylo,
  monthKey,
  monthStart,
  monthlyCounts,
  parseTourPhylo,
  type PhyloLayout,
  type TourPhyloSummary,
} from "@/lib/tour-phylo";

/**
 * Categorical palette, validated for adjacent-pair colour-vision separation
 * on white (dataviz validate_palette.js). Slots are assigned in fixed order;
 * "Other" is always neutral grey. Three slots are under 3:1 contrast, so the
 * legend carries counts and a table view is offered.
 */
const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OTHER = "#a3a19b";

function colorsFor(names: string[], isOther: (name: string, i: number) => boolean): string[] {
  let slot = 0;
  return names.map((name, i) => (isOther(name, i) || slot >= PALETTE.length ? OTHER : at(PALETTE, slot++)));
}

type ColorBy = "group" | "province";

// Drawing space. The SVGs stretch to their box (preserveAspectRatio="none"),
// so strokes use vector-effect="non-scaling-stroke" and keep their width.
const W = 1000;
const TREE_H = 600;
const FREQ_H = 160;
const PAD_Y = 8;
/** Months shown before the first genome; the root branch runs off the left edge. */
const LEAD_MONTHS = 2;
/** Playback speed. */
const MS_PER_MONTH = 450;

/** Indexed read for arrays whose bounds the layout already guarantees. */
function at<T>(list: ArrayLike<T>, i: number): T {
  return list[i] as T;
}

function f(n: number): string {
  return n.toFixed(1);
}

type Tree = {
  layout: PhyloLayout;
  lineages: string[];
  groupLabels: string[];
  provinces: string[];
};

export function PhyloTree({ summary }: { summary: TourPhyloSummary }) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [failed, setFailed] = useState(false);
  const [colorBy, setColorBy] = useState<ColorBy>("group");
  const [hover, setHover] = useState<number | null>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tour/phylo", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((raw) => {
        const phylo = parseTourPhylo(raw);
        setTree({
          layout: layoutPhylo(phylo),
          lineages: phylo.lineages,
          groupLabels: phylo.groups.map((g) => g.label),
          provinces: phylo.provinces,
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Variant tree failed to load", error);
          setFailed(true);
        }
      });
    return () => controller.abort();
  }, []);

  const groupColors = useMemo(
    () => colorsFor(summary.groups.map((g) => g.id), (id) => id === "other"),
    [summary.groups],
  );
  const provinceColors = useMemo(
    () => colorsFor(summary.provinces.map((p) => p.name), (name) => name === "Other"),
    [summary.provinces],
  );
  const colors = colorBy === "group" ? groupColors : provinceColors;
  const categories =
    colorBy === "group"
      ? summary.groups.map((g) => ({ label: g.label, count: g.count }))
      : summary.provinces.map((p) => ({ label: p.name, count: p.count }));

  // Time axis, shared by the tree and the frequency chart.
  const months = useMemo(() => {
    const out: string[] = [];
    let k = monthStart(summary.firstMonth) - LEAD_MONTHS / 12;
    const end = monthStart(summary.lastMonth);
    while (k <= end + 1e-6) {
      out.push(monthKey(k + 1e-6));
      k += 1 / 12;
    }
    return out;
  }, [summary.firstMonth, summary.lastMonth]);
  const monthAt = (i: number) => at(months, Math.max(0, Math.min(months.length - 1, i)));
  const x0 = monthStart(monthAt(0));
  const x1 = monthStart(monthAt(months.length - 1)) + 1 / 12;
  const sx = (year: number) => ((year - x0) / (x1 - x0)) * W;

  // Playback position: genomes sampled after the end of this month are hidden.
  const [monthIndex, setMonthIndex] = useState(months.length - 1);
  const cutoff = monthStart(monthAt(monthIndex)) + 1 / 12;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setMonthIndex((i) => {
        if (i >= months.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, MS_PER_MONTH);
    return () => window.clearInterval(id);
  }, [playing, months.length]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (monthIndex >= months.length - 1) setMonthIndex(LEAD_MONTHS);
    setPlaying(true);
  };

  const n = tree?.layout.tips.length ?? 0;
  const sy = (tipY: number) => PAD_Y + (n > 1 ? (tipY / (n - 1)) * (TREE_H - 2 * PAD_Y) : TREE_H / 2);

  // One <path> per colour for branches and one for tips keeps ~11k nodes cheap.
  const paths = useMemo(() => {
    if (!tree) return null;
    const { layout } = tree;
    const by = layout[colorBy];
    const size = layout.x.length;
    const branches: string[][] = colors.map(() => []);
    const tips: string[][] = colors.map(() => []);
    const lo = new Float64Array(size).fill(Infinity);
    const hi = new Float64Array(size).fill(-Infinity);
    for (let i = size - 1; i >= 0; i--) {
      const p = at(layout.parent, i);
      const x = sx(at(layout.x, i));
      const y = sy(at(layout.y, i));
      const color = at(by, i);
      if (p >= 0) {
        at(branches, color).push(`M${f(sx(at(layout.x, p)))},${f(y)}H${f(x)}`);
        lo[p] = Math.min(at(lo, p), y);
        hi[p] = Math.max(at(hi, p), y);
      }
      if (layout.isTip[i]) {
        if (at(layout.x, i) <= cutoff) at(tips, color).push(`M${f(x)},${f(y)}h0`);
      } else if (at(hi, i) > at(lo, i)) {
        at(branches, color).push(`M${f(x)},${f(at(lo, i))}V${f(at(hi, i))}`);
      }
    }
    return { branches: branches.map((b) => b.join("")), tips: tips.map((t) => t.join("")) };
    // sx/sy only depend on values already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, colorBy, colors, cutoff, x0, x1]);

  // Stacked monthly counts, drawn on the same x scale as the tree.
  const freq = useMemo(() => {
    if (!tree) return null;
    const rows = monthlyCounts(tree.layout, colorBy, categories.length);
    const byMonth = new Map(rows.map((r) => [r.month, r.counts]));
    const series: number[][] = months.map((m) => byMonth.get(m) ?? new Array(categories.length).fill(0));
    const peak = Math.max(1, ...series.map((c) => c.reduce((a, b) => a + b, 0)));
    const sh = (v: number) => FREQ_H - (v / peak) * (FREQ_H - 6);
    const areas = categories.map((_, k) => {
      const top: string[] = [];
      const bottom: string[] = [];
      months.forEach((m, i) => {
        const row = at(series, i);
        const below = row.slice(0, k).reduce((a, b) => a + b, 0);
        const upper = sh(below + at(row, k));
        const left = sx(monthStart(m));
        const right = sx(monthStart(m) + 1 / 12);
        top.push(`${f(left)},${f(upper)} ${f(right)},${f(upper)}`);
        bottom.unshift(`${f(right)},${f(sh(below))} ${f(left)},${f(sh(below))}`);
      });
      return `M${top.join(" L")} L${bottom.join(" L")}Z`;
    });
    return { series, peak, areas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, colorBy, months, categories.length]);

  const treeBox = useRef<HTMLDivElement>(null);
  const onTreeMove = (event: React.PointerEvent) => {
    if (!tree || !treeBox.current) return;
    const rect = treeBox.current.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const toPxX = rect.width / W;
    const toPxY = rect.height / TREE_H;
    const { layout } = tree;
    const guess = Math.round(((py / toPxY - PAD_Y) / (TREE_H - 2 * PAD_Y)) * (n - 1));
    let best: number | null = null;
    let bestDist = 14 * 14;
    for (let t = Math.max(0, guess - 60); t <= Math.min(n - 1, guess + 60); t++) {
      const i = at(layout.tips, t);
      if (at(layout.x, i) > cutoff) continue;
      const dx = sx(at(layout.x, i)) * toPxX - px;
      const dy = sy(at(layout.y, i)) * toPxY - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHover(best);
  };

  const onFreqMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const year = x0 + ((event.clientX - rect.left) / rect.width) * (x1 - x0);
    const i = Math.floor((year - x0) * 12 + 1e-6);
    setHoverMonth(i >= 0 && i < months.length ? i : null);
  };

  // Axis: a tick at each quarter, year labels in January.
  const ticks = months.flatMap((m) => {
    const month = Number(m.slice(5));
    if ((month - 1) % 3) return [];
    return [{ key: m, left: (sx(monthStart(m)) / W) * 100, year: month === 1 ? m.slice(0, 4) : null, label: formatMonth(m).slice(0, 3) }];
  });

  const hovered = hover !== null && tree ? hover : null;

  return (
    <div className="mt-8 rounded-2xl border border-[#2b3278]/10 bg-white p-4 shadow-[0_10px_30px_-12px_rgba(43,50,120,0.18)] md:p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="radiogroup" aria-label="Colour the tree by" className="flex rounded-full border border-[#2b3278]/15 p-1 text-sm">
          {(["group", "province"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={colorBy === option}
              onClick={() => setColorBy(option)}
              className={`rounded-full px-3.5 py-1 font-semibold transition-colors ${
                colorBy === option ? "bg-[#2b3278] text-white" : "text-[#2b3278] hover:bg-[#f0e8f2]"
              }`}
            >
              {option === "group" ? "Lineage" : "Province"}
            </button>
          ))}
        </div>

        <div className="flex min-w-[16rem] flex-1 items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!tree}
            aria-label={playing ? "Pause" : "Play through time"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a7797] text-white transition-colors hover:bg-[#236681] disabled:opacity-40"
          >
            {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />}
          </button>
          <input
            type="range"
            min={LEAD_MONTHS}
            max={months.length - 1}
            value={monthIndex}
            onChange={(e) => {
              setPlaying(false);
              setMonthIndex(Number(e.target.value));
            }}
            aria-label="Show genomes sampled up to"
            aria-valuetext={formatMonth(monthAt(monthIndex))}
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#12ca99]"
          />
          <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-[#2b3278]">
            {formatMonth(monthAt(monthIndex))}
          </span>
        </div>
      </div>

      <div className="mt-5 lg:flex lg:gap-8">
        <div className="min-w-0 flex-1">
          {/* Tree — sized to the screen when presenting so the whole slide fits */}
          <div
            ref={treeBox}
            className="relative h-[360px] overflow-hidden md:h-[460px] md:group-data-presenting/tour:h-[clamp(280px,calc(100svh_-_730px),460px)]"
            onPointerMove={onTreeMove}
            onPointerLeave={() => setHover(null)}
          >
            {!tree && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-[#5b6770]">
                {failed ? "The variant tree couldn't be loaded right now." : "Loading the variant tree…"}
              </p>
            )}
            {paths && (
              <svg
                viewBox={`0 0 ${W} ${TREE_H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label={`Time-scaled tree of ${summary.tipCount.toLocaleString("en-PH")} SARS-CoV-2 genomes, coloured by ${colorBy === "group" ? "lineage" : "province"}.`}
              >
                <defs>
                  <clipPath id="phylo-cutoff">
                    <rect x={-W} y={0} width={W + sx(cutoff)} height={TREE_H} />
                  </clipPath>
                </defs>
                {ticks.map((t) => (
                  <line
                    key={t.key}
                    x1={(t.left / 100) * W}
                    x2={(t.left / 100) * W}
                    y1={0}
                    y2={TREE_H}
                    stroke="#2b3278"
                    strokeOpacity={t.year ? 0.14 : 0.06}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <g clipPath="url(#phylo-cutoff)" fill="none" strokeLinecap="round">
                  {paths.branches.map((d, k) =>
                    d ? <path key={`b${k}`} d={d} stroke={colors[k]} strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null,
                  )}
                  {paths.tips.map((d, k) =>
                    d ? <path key={`t${k}`} d={d} stroke={colors[k]} strokeWidth={4} vectorEffect="non-scaling-stroke" /> : null,
                  )}
                </g>
              </svg>
            )}
            {tree && hovered !== null && (
              <TipTooltip
                left={(sx(at(tree.layout.x, hovered)) / W) * 100}
                top={(sy(at(tree.layout.y, hovered)) / TREE_H) * 100}
                color={at(colors, at(tree.layout[colorBy], hovered))}
                lineage={tree.lineages[at(tree.layout.lineage, hovered)] ?? null}
                group={at(tree.groupLabels, at(tree.layout.group, hovered))}
                province={at(tree.provinces, at(tree.layout.province, hovered))}
                month={formatMonth(monthKey(at(tree.layout.x, hovered)))}
              />
            )}
          </div>

          {/* Frequency */}
          <div className="mt-4 flex items-baseline justify-between gap-4 text-xs font-semibold text-[#5b6770]">
            <span>Genomes sequenced per month</span>
            {freq && <span className="tabular-nums">peak {freq.peak.toLocaleString("en-PH")}</span>}
          </div>
          <div
            className="relative mt-1 h-24 md:h-28"
            onPointerMove={onFreqMove}
            onPointerLeave={() => setHoverMonth(null)}
          >
            {freq && (
              <svg viewBox={`0 0 ${W} ${FREQ_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <clipPath id="freq-cutoff">
                    <rect x={0} y={0} width={sx(cutoff)} height={FREQ_H} />
                  </clipPath>
                </defs>
                <g clipPath="url(#freq-cutoff)">
                  {freq.areas.map((d, k) => (
                    <path key={k} d={d} fill={colors[k]} stroke="#ffffff" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  ))}
                </g>
                <line x1={0} x2={W} y1={FREQ_H} y2={FREQ_H} stroke="#2b3278" strokeOpacity={0.3} vectorEffect="non-scaling-stroke" />
                {hoverMonth !== null && (
                  <rect
                    x={sx(monthStart(monthAt(hoverMonth)))}
                    width={sx(monthStart(monthAt(hoverMonth)) + 1 / 12) - sx(monthStart(monthAt(hoverMonth)))}
                    y={0}
                    height={FREQ_H}
                    fill="#2b3278"
                    fillOpacity={0.08}
                  />
                )}
              </svg>
            )}
            {freq && hoverMonth !== null && (
              <MonthTooltip
                left={((sx(monthStart(monthAt(hoverMonth))) + sx(monthStart(monthAt(hoverMonth)) + 1 / 12)) / 2 / W) * 100}
                month={formatMonth(monthAt(hoverMonth))}
                rows={categories
                  .map((c, k) => ({ label: c.label, color: at(colors, k), value: at(at(freq.series, hoverMonth), k) }))
                  .filter((r) => r.value > 0)}
              />
            )}
          </div>

          {/* Time axis */}
          <div className="relative mt-1 h-8 text-[11px] text-[#5b6770]" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t.key} className="absolute top-0 -translate-x-1/2 text-center leading-tight" style={{ left: `${t.left}%` }}>
                <span className="block max-sm:hidden">{t.label}</span>
                {t.year && <span className="block font-bold text-[#2b3278]">{t.year}</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Legend with counts — identity never relies on colour alone */}
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#2b3278]/10 pt-4 text-sm lg:mt-0 lg:w-52 lg:shrink-0 lg:flex-col lg:flex-nowrap lg:self-start lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {categories.map((c, k) =>
            c.count > 0 ? (
              <li key={c.label} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[k] }} aria-hidden="true" />
                <span className="font-medium text-[#333333] lg:flex-1">{c.label}</span>
                <span className="tabular-nums text-[#5b6770]">{c.count.toLocaleString("en-PH")}</span>
              </li>
            ) : null,
          )}
        </ul>
      </div>

      {freq && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-[#2a7797]">Show as a table</summary>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="w-full border-collapse text-left tabular-nums">
              <thead className="sticky top-0 bg-white text-[#5b6770]">
                <tr>
                  <th className="py-1 pr-3 font-semibold">Month</th>
                  {categories.map((c) => (
                    <th key={c.label} className="py-1 pr-3 font-semibold">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) =>
                  at(freq.series, i).some((v) => v > 0) ? (
                    <tr key={m} className="border-t border-[#2b3278]/[0.07]">
                      <td className="py-1 pr-3 font-medium">{formatMonth(m)}</td>
                      {at(freq.series, i).map((v, k) => (
                        <td key={k} className="py-1 pr-3">{v || ""}</td>
                      ))}
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function tooltipAlign(left: number): string {
  return left > 65 ? "-translate-x-full -ml-3" : "ml-3";
}

function TipTooltip({
  left,
  top,
  color,
  lineage,
  group,
  province,
  month,
}: {
  left: number;
  top: number;
  color: string;
  lineage: string | null;
  group: string;
  province: string;
  month: string;
}) {
  return (
    <>
      <span
        className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{ left: `${left}%`, top: `${top}%`, backgroundColor: color }}
        aria-hidden="true"
      />
      <span
        className={`pointer-events-none absolute z-10 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1c2152] px-3 py-2 text-xs text-white shadow-lg ${tooltipAlign(left)}`}
        style={{ left: `${left}%`, top: `${Math.min(88, Math.max(12, top))}%` }}
        aria-hidden="true"
      >
        <span className="block text-base font-black">{lineage ?? "Unassigned"}</span>
        <span className="block text-white/80">{group}</span>
        <span className="mt-1 block text-white/70">
          {month} · {province}
        </span>
      </span>
    </>
  );
}

function MonthTooltip({
  left,
  month,
  rows,
}: {
  left: number;
  month: string;
  rows: { label: string; color: string; value: number }[];
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <span
      className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-[#1c2152] px-3 py-2 text-xs text-white shadow-lg ${tooltipAlign(left)}`}
      style={{ left: `${left}%` }}
      aria-hidden="true"
    >
      <span className="block font-semibold text-white/70">
        {month} · {total.toLocaleString("en-PH")} genomes
      </span>
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
