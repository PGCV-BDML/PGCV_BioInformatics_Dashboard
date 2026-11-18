import { useState } from "react";
import type { TourCovidStats } from "@/lib/tour-stats";
import { BRAND, CARD } from "../brand";
import { CountUp } from "../count-up";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import { useReveal } from "../use-reveal";
import styles from "../tour-motion.module.css";
import { delay, stagger, type SlideProps } from "./shared";

function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Round an axis maximum up to 1, 2, 2.5 or 5 × 10ⁿ so the ticks read cleanly. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

function QuarterlyChart({ quarterly }: { quarterly: TourCovidStats["quarterly"] }) {
  const [active, setActive] = useState<number | null>(null);
  const [ref, reveal] = useReveal<HTMLDivElement>();
  // Bars grow left to right over ~0.8s, then the peak label appears.
  const barStep = Math.min(60, 800 / Math.max(1, quarterly.length));
  const peak = Math.max(1, ...quarterly.map((q) => q.samples));
  const peakIndex = quarterly.findIndex((q) => q.samples === peak);
  const top = niceCeil(peak);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const dense = quarterly.length > 16;

  return (
    <div ref={ref} data-reveal={reveal} className="mt-8 flex gap-3 canvas:mt-3 canvas:min-h-0 canvas:flex-1">
      {/* y-axis: as tall as the plot, which leaves room under it for the axis below */}
      <div className="relative h-64 w-10 shrink-0 text-right text-[11px] tabular-nums text-[#5b6770] canvas:h-[calc(100%-48px)] canvas:w-12 canvas:text-[14px]" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(t / top) * 100}%` }}>
            {t.toLocaleString("en-PH")}
          </span>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative h-64 canvas:h-auto canvas:min-h-0 canvas:flex-1" onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <span
              key={t}
              className={`absolute inset-x-0 h-px ${t === 0 ? "bg-[#2b3278]/30" : "bg-[#2b3278]/[0.07]"}`}
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <ol className="absolute inset-0 flex items-end gap-0.5 canvas:gap-1.5">
            {quarterly.map((q, i) => {
              const isPeak = i === peakIndex;
              const isActive = active === i;
              const height = Math.max(q.samples > 0 ? 1.5 : 0, (q.samples / top) * 100);
              const align =
                i > quarterly.length * 0.7 ? "right-0" : i < quarterly.length * 0.3 ? "left-0" : "left-1/2 -translate-x-1/2";
              return (
                <li
                  key={q.label}
                  tabIndex={0}
                  aria-label={`${q.label}: ${q.samples.toLocaleString("en-PH")} samples`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#12ca99]"
                >
                  {isActive && <span className="absolute inset-0 rounded-md bg-[#2b3278]/[0.05]" aria-hidden="true" />}
                  <span
                    className={`${styles.bar} relative w-full max-w-12 rounded-t-[4px] transition-[filter] duration-150`}
                    style={{
                      ...delay(Math.round(i * barStep)),
                      height: `${height}%`,
                      background: isPeak
                        ? `linear-gradient(to top, ${BRAND.purple}, #8a3a8a)`
                        : `linear-gradient(to top, ${BRAND.deepTeal}, #1f9e8a)`,
                      filter: isActive ? "brightness(1.15)" : undefined,
                    }}
                    aria-hidden="true"
                  >
                    {isPeak && !isActive && (
                      <span
                        className={`${styles.fadeIn} absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#5e205e] px-2 py-0.5 text-[11px] font-bold text-white canvas:text-[14px]`}
                        style={delay(Math.round(quarterly.length * barStep) + 500)}
                      >
                        Peak · {q.samples.toLocaleString("en-PH")}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <span
                      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-[#1c2152] px-3 py-2 text-left text-xs text-white shadow-lg canvas:text-[14px] ${align}`}
                      style={{ bottom: `calc(${height}% + 10px)` }}
                      aria-hidden="true"
                    >
                      <span className="block font-semibold text-white/70">{q.label}</span>
                      <span className="block text-base font-black tabular-nums canvas:text-[18px]">
                        {q.samples.toLocaleString("en-PH")}
                        <span className="ml-1 text-xs font-medium text-white/70 canvas:text-[14px]">samples</span>
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* x-axis: quarter, with the year under the first quarter shown for that year */}
        <ol className="mt-2 flex gap-0.5 canvas:h-10 canvas:gap-1.5" aria-hidden="true">
          {quarterly.map((q, i) => {
            const [quarter, year] = q.label.split(" ");
            const firstOfYear = i === 0 || quarterly[i - 1]?.label.split(" ")[1] !== year;
            return (
              <li key={q.label} className="min-w-0 flex-1 text-center">
                <span className={`block text-[10px] font-semibold text-[#5b6770] canvas:text-[14px] canvas:leading-tight ${dense ? "max-sm:invisible" : ""}`}>
                  {quarter}
                </span>
                <span className={`block h-4 whitespace-nowrap text-[11px] font-bold text-[#2b3278] canvas:h-5 canvas:text-[14px] ${firstOfYear ? "" : "invisible"}`}>
                  {year}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * The decks' `stats`: the totals as a column of tiles on the left and the
 * per-quarter chart filling the rest, live from the database. On a phone the
 * tiles sit two by two above the chart.
 */
export function CovidSlide({ content, audience, meta, stats }: SlideProps & { stats: TourCovidStats | null }) {
  const { covid } = content;
  const visual = audience === "visual";
  const from = formatMonthYear(stats?.firstRunDate ?? null);
  const to = formatMonthYear(stats?.lastRunDate ?? null);
  const allTiles = stats
    ? [
        { value: stats.totalSamples.toLocaleString("en-PH"), label: "samples sequenced", color: BRAND.deepTeal },
        { value: stats.totalRuns.toLocaleString("en-PH"), label: "sequencing runs", color: BRAND.purple },
        { value: stats.lineageAssigned.toLocaleString("en-PH"), label: "genomes assigned a lineage", color: BRAND.teal },
        ...(stats.pctLineageAssigned !== null
          ? [{ value: `${stats.pctLineageAssigned.toFixed(1)}%`, label: "lineage assignment rate", color: BRAND.navy }]
          : []),
      ]
    : [];
  // Visual keeps the headline number only.
  const tiles = visual ? allTiles.slice(0, 1) : allTiles;

  return (
    <LightSlide
      meta={meta}
      eyebrow="Public health impact"
      title={covid.title}
      intro={!visual && <TourCopy text={covid.intro} audience={audience} />}
      source={stats ? "PGC Visayas SARS-CoV-2 sequencing runs · aggregate counts only" : undefined}
    >
      {stats && (
        <div className="grid grid-cols-1 gap-5 canvas:grid canvas:h-full canvas:grid-cols-[300px_minmax(0,1fr)] canvas:gap-4">
          <dl className={`grid gap-4 canvas:flex canvas:min-h-0 canvas:flex-col canvas:gap-2.5 ${visual ? "" : "grid-cols-2"}`}>
            {tiles.map((tile, i) => (
              <div
                key={tile.label}
                className={`${CARD} ${styles.enter} relative flex flex-col-reverse justify-end overflow-hidden py-4 pl-6 pr-5 canvas:flex-1 canvas:justify-center canvas:py-2.5`}
                style={stagger(i)}
              >
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: tile.color }} aria-hidden="true" />
                <dt className="mt-0.5 text-sm font-medium text-[#5b6770] canvas:mt-1.5 canvas:text-[18px] canvas:leading-snug">{tile.label}</dt>
                <dd className={`font-black tracking-tight text-[#2b3278] tabular-nums ${visual ? "text-6xl canvas:text-[64px] canvas:leading-none" : "text-3xl canvas:text-[36px] canvas:leading-none"}`}>
                  <CountUp value={tile.value} />
                </dd>
              </div>
            ))}
          </dl>
          {stats.quarterly.length > 0 && (
            <figure className={`${CARD} ${styles.enter} flex flex-col p-6 canvas:min-h-0 canvas:flex-1 canvas:px-5 canvas:py-4`} style={delay(260)}>
              <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-lg font-bold text-[#2b3278] canvas:text-[20px]">Samples sequenced per quarter</span>
                {from && to && (
                  <span className="text-sm font-medium text-[#5b6770] canvas:text-[14px]">
                    {from} – {to}
                  </span>
                )}
              </figcaption>
              <QuarterlyChart quarterly={stats.quarterly} />
            </figure>
          )}
        </div>
      )}
    </LightSlide>
  );
}
