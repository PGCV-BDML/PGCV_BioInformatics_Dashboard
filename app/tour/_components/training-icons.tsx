import type { CSSProperties, ReactNode } from "react";
import { LOGO } from "./brand";
import { AssemblyIcon, BarcodeIcon, IconFrame } from "./service-icons";
import styles from "./tour-motion.module.css";

/*
 * Icons for the trainings slide, drawn like the service icons (48-unit grid,
 * 2.25 stroke, one accent in the logo gradient, an entrance when the slide
 * comes into view and a small loop while hovered). DNA Barcoding and Whole
 * Genome Assembly reuse the services' icons for the same work.
 */

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** A terminal window: the prompt slides in, the cursor blinks on hover. */
function CodingIcon() {
  return (
    <IconFrame gradient>
      {(accent) => (
        <>
          <rect x="6" y="9" width="36" height="30" rx="3.5" />
          <path d="M6 16.5h36" strokeOpacity={0.45} />
          {[10.75, 14.75, 18.75].map((cx, i) => (
            <circle key={cx} cx={cx} cy="12.75" r="1.15" fill="currentColor" stroke="none" className={styles.pop} style={d(i * 60)} />
          ))}
          <path d="M12.5 22.5l5 4.5-5 4.5" stroke={accent} strokeWidth={2.75} className={styles.slideLeft} style={d(150)} />
          <path d="M21.5 32h8" className={styles.blink} />
        </>
      )}
    </IconFrame>
  );
}

/**
 * Two DNA strands. The forward primer slides onto the bottom strand pointing
 * right, the reverse primer onto the top strand pointing left.
 */
function PrimerIcon() {
  return (
    <IconFrame gradient>
      {(accent) => (
        <>
          <path d="M6 12.5h36" />
          <path d="M6 35.5h36" />
          <g className={styles.slideRight} style={d(150)}>
            <path
              d="M40.5 19.5H27M30.75 15.75 27 19.5l3.75 3.75"
              stroke={accent}
              strokeWidth={3}
              className={styles.bob}
              style={d(0)}
            />
          </g>
          <g className={styles.slideLeft} style={d(250)}>
            <path
              d="M7.5 28.5H21M17.25 24.75 21 28.5l-3.75 3.75"
              stroke={accent}
              strokeWidth={3}
              className={styles.bob}
              style={d(400)}
            />
          </g>
          {/* Where the primers bind. */}
          <path
            d="M33.5 14.5v3M37.5 14.5v3M10.5 30.5v3M14.5 30.5v3"
            strokeWidth={1.5}
            strokeOpacity={0.35}
            className={styles.fadeIn}
            style={d(500)}
          />
        </>
      )}
    </IconFrame>
  );
}

/** The share of each taxon in three samples: [x, top of the first band, top of the second]. */
const ABUNDANCE_BARS = [
  { x: 14, a: 33, b: 26.5 },
  { x: 24, a: 30, b: 24.5 },
  { x: 34, a: 35.5, b: 23 },
];

/** Microbes over stacked bars of relative abundance, the usual 16S result. */
function MetabarcodingIcon() {
  const band = (x: number, y1: number, y2: number, color: string) => (
    <line x1={x} x2={x} y1={y1} y2={y2} stroke={color} strokeWidth={6.5} strokeLinecap="butt" />
  );
  return (
    <IconFrame>
      {() => (
        <>
          <g className={styles.pop} style={d(0)}>
            <g className={styles.drift}>
              <path d="M9.5 10.5h8.5" strokeWidth={5} />
              <path d="M20.5 10.5c1.4-2.3 2.8-2.3 4.2 0s2.8 2.3 4.2 0" strokeWidth={1.75} />
            </g>
          </g>
          <g className={styles.pop} style={d(80)}>
            <g className={styles.driftAlt}>
              <circle cx="35" cy="9.5" r="2.25" fill="currentColor" stroke="none" />
              <circle cx="39.25" cy="12.25" r="2.25" fill="currentColor" stroke="none" />
            </g>
          </g>
          {ABUNDANCE_BARS.map((bar, i) => (
            <g key={bar.x} className={styles.rise} style={d(200 + i * 80)}>
              {band(bar.x, 39.5, bar.a, LOGO.orange)}
              {band(bar.x, bar.a - 1.25, bar.b, LOGO.magenta)}
              {band(bar.x, bar.b - 1.25, 20, LOGO.blue)}
            </g>
          ))}
          <path d="M8 42h32" strokeOpacity={0.4} />
        </>
      )}
    </IconFrame>
  );
}

/** Keyed by the training's id, which defaults to its name as a slug (lib/tour.ts). */
const TRAINING_ICONS: Record<string, () => ReactNode> = {
  "basic-coding": CodingIcon,
  "primer-designing": PrimerIcon,
  "dna-barcoding": BarcodeIcon,
  "16s-metabarcoding-analysis": MetabarcodingIcon,
  "whole-genome-assembly": AssemblyIcon,
};

export function hasTrainingIcon(id: string): boolean {
  return id in TRAINING_ICONS;
}

/** "RNA-seq Analysis" -> "RA": what a training without a drawn icon shows. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * A training's stop on the path: a white disc with its icon, ringed in the
 * page colour so the line behind it stops short. `large` is the Visual
 * audience's size, where the icon stands in for the summary.
 */
export function TrainingDisc({
  id,
  name,
  color,
  delay = 0,
  large = false,
}: {
  id: string;
  name: string;
  color: string;
  delay?: number;
  large?: boolean;
}) {
  const Icon = TRAINING_ICONS[id];
  return (
    <span
      className={`relative z-[1] flex shrink-0 items-center justify-center rounded-full bg-white ${
        large
          ? "h-24 w-24 [&_svg]:h-14 [&_svg]:w-14 canvas:h-40 canvas:w-40 canvas:[&_svg]:h-[92px] canvas:[&_svg]:w-[92px]"
          : "h-[72px] w-[72px] [&_svg]:h-11 [&_svg]:w-11 canvas:h-32 canvas:w-32 canvas:[&_svg]:h-[68px] canvas:[&_svg]:w-[68px]"
      }`}
      style={
        {
          color,
          boxShadow: `0 0 0 8px var(--page, #f7f6fa), inset 0 0 0 2px ${color}47, 0 12px 28px -14px rgba(43, 50, 120, 0.45)`,
          "--base": `${delay}ms`,
        } as CSSProperties
      }
      aria-hidden="true"
      data-training-icon={Icon ? id : "fallback"}
    >
      {Icon ? (
        <Icon />
      ) : (
        <span className={`font-black ${large ? "text-3xl canvas:text-5xl" : "text-xl canvas:text-3xl"}`}>{initials(name)}</span>
      )}
    </span>
  );
}
