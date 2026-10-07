import { useId, type CSSProperties } from "react";
import { BRAND, LOGO } from "./brand";
import styles from "./motifs.module.css";

/*
 * Slow, low-contrast background art for the light tour sections, one theme
 * per slide. Rendered inside SectionBackdrop, which hides it from assistive
 * tech and pauses it off screen; motifs.module.css stops it for reduced motion.
 */

export type LightMotif = "assembly" | "network" | "contours" | "radar" | "bokeh" | "glyphs";

const LOGO_CYCLE = [LOGO.orange, LOGO.crimson, LOGO.magenta, LOGO.purple, LOGO.blue, BRAND.teal];

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/* --- Services: sequencing reads sliding in and assembling into a contig --- */

/** [row y, start x, length]; rows above and below the contig line at y=210. */
const READS: [number, number, number][] = [
  [130, 60, 150],
  [150, 170, 190],
  [170, 330, 140],
  [190, 420, 160],
  [110, 250, 120],
  [230, 90, 170],
  [250, 230, 150],
  [270, 360, 190],
  [290, 150, 110],
  [310, 470, 120],
  [130, 430, 130],
  [290, 320, 90],
];

function Assembly() {
  return (
    <svg className={`${styles.art} ${styles.assembly}`} viewBox="0 0 640 420" fill="none">
      <line x1="40" y1="210" x2="610" y2="210" strokeWidth="5" strokeLinecap="round" stroke={BRAND.navy} className={styles.contig} />
      {READS.map(([y, x, length], i) => (
        <line
          key={i}
          x1={x}
          y1={y}
          x2={x + length}
          y2={y}
          strokeWidth="7"
          strokeLinecap="round"
          stroke={LOGO_CYCLE[i % LOGO_CYCLE.length]}
          className={styles.read}
          // Reads above the contig come in from the left, those below from the right.
          style={{ "--dx": y < 210 ? "-90px" : "90px", "--d": `${(i * 0.42).toFixed(2)}s` } as Vars}
        />
      ))}
    </svg>
  );
}

/* --- Trainings: a network of people, links fading in and out ------------- */

const NODES: [number, number][] = [
  [90, 120], [210, 70], [330, 140], [470, 90], [560, 200], [420, 250],
  [270, 260], [140, 250], [60, 360], [200, 390], [350, 380], [500, 380], [580, 320],
];

const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [2, 6], [6, 7], [7, 0],
  [7, 8], [8, 9], [9, 6], [6, 10], [10, 5], [10, 11], [11, 12], [12, 4], [9, 10],
];

function Network() {
  return (
    <svg className={`${styles.art} ${styles.network}`} viewBox="0 0 640 460" fill="none">
      {LINKS.map(([a, b], i) => (
        <line
          key={`${a}-${b}`}
          x1={NODES[a]![0]}
          y1={NODES[a]![1]}
          x2={NODES[b]![0]}
          y2={NODES[b]![1]}
          pathLength={1}
          stroke={BRAND.navy}
          strokeWidth="1.5"
          className={styles.link}
          style={{ "--d": `${((i * 1.7) % 12).toFixed(1)}s` } as Vars}
        />
      ))}
      {NODES.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 7 : 5}
          fill={LOGO_CYCLE[i % LOGO_CYCLE.length]}
          className={styles.node}
          style={{ "--d": `${((i * 0.6) % 4).toFixed(1)}s` } as Vars}
        />
      ))}
    </svg>
  );
}

/* --- Projects: topographic contour lines, drifting slowly ---------------- */

/** A closed, wobbly ring: a radius that varies smoothly with the angle. */
function contourPath(radius: number, wobble: number, phase: number): string {
  const points = Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2;
    const r = radius + wobble * (Math.sin(3 * t + phase) + 0.5 * Math.sin(5 * t - phase * 1.7));
    return `${(300 + r * Math.cos(t)).toFixed(1)} ${(300 + r * Math.sin(t)).toFixed(1)}`;
  });
  return `M${points.join("L")}Z`;
}

const CONTOURS = Array.from({ length: 7 }, (_, i) => contourPath(48 + i * 36, 6 + i * 3.2, 0.6 + i * 0.35));

function Contours() {
  return (
    <svg className={`${styles.art} ${styles.contours}`} viewBox="0 0 600 600" fill="none">
      <g className={styles.contourSpin}>
        {CONTOURS.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={i % 2 ? BRAND.deepTeal : BRAND.teal}
            strokeWidth="1.5"
            className={`${styles.contour} ${i % 2 ? styles.contourReverse : ""}`}
          />
        ))}
      </g>
    </svg>
  );
}

/* --- COVID-19: a surveillance radar sweep with pulse rings --------------- */

/** Blips as [angle clockwise from east, distance]; each lights as the sweep passes. */
const BLIPS: [number, number][] = [
  [35, 170],
  [110, 95],
  [165, 215],
  [240, 140],
  [305, 200],
];

const SWEEP_SECONDS = 10;

function Radar() {
  const gradientId = `${useId()}-sweep`;
  const sector = (degrees: number) => {
    const a = (degrees * Math.PI) / 180;
    return `${(300 + 260 * Math.cos(a)).toFixed(1)} ${(300 + 260 * Math.sin(a)).toFixed(1)}`;
  };
  return (
    <svg className={`${styles.art} ${styles.radar}`} viewBox="0 0 600 600" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0" stopColor={LOGO.magenta} stopOpacity="0" />
          <stop offset="1" stopColor={LOGO.magenta} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {[90, 175, 260].map((r) => (
        <circle key={r} cx="300" cy="300" r={r} stroke={LOGO.magenta} strokeOpacity="0.22" strokeWidth="1.5" />
      ))}
      <path d="M40 300H560M300 40V560" stroke={LOGO.magenta} strokeOpacity="0.12" strokeWidth="1.5" />
      {[0, 1].map((i) => (
        <circle
          key={i}
          cx="300"
          cy="300"
          r="260"
          stroke={LOGO.magenta}
          strokeWidth="2"
          className={styles.ping}
          style={{ "--d": `${i * 3}s` } as Vars}
        />
      ))}
      {/* A 60° wedge whose leading edge points east; rotating it clockwise sweeps the dial. */}
      <path
        d={`M300 300L${sector(-60)}A260 260 0 0 1 ${sector(0)}Z`}
        fill={`url(#${gradientId})`}
        className={styles.sweep}
        style={{ "--t": `${SWEEP_SECONDS}s` } as Vars}
      />
      {BLIPS.map(([angle, distance]) => {
        const a = (angle * Math.PI) / 180;
        return (
          <circle
            key={angle}
            cx={(300 + distance * Math.cos(a)).toFixed(1)}
            cy={(300 + distance * Math.sin(a)).toFixed(1)}
            r="6"
            fill={LOGO.crimson}
            className={styles.blip}
            style={{ "--t": `${SWEEP_SECONDS}s`, "--d": `${((angle / 360) * SWEEP_SECONDS).toFixed(2)}s` } as Vars}
          />
        );
      })}
    </svg>
  );
}

/* --- Team: soft out-of-focus lights drifting upward ---------------------- */

/** [left %, size px, colour index, seconds, delay seconds]. */
const LIGHTS: [number, number, number, number, number][] = [
  [8, 90, 0, 26, 0],
  [18, 40, 4, 22, 9],
  [30, 120, 2, 32, 4],
  [44, 56, 5, 24, 14],
  [56, 80, 1, 28, 2],
  [66, 36, 3, 21, 11],
  [74, 110, 4, 34, 7],
  [84, 60, 0, 25, 16],
  [92, 44, 5, 23, 5],
  [38, 70, 3, 30, 19],
  [62, 100, 2, 31, 22],
  [88, 76, 1, 27, 25],
];

function Bokeh() {
  return (
    <span className={styles.bokeh}>
      {LIGHTS.map(([left, size, color, seconds, delay], i) => (
        <span
          key={i}
          className={styles.light}
          style={
            {
              "--x": `${left}%`,
              // Resting height when motion is reduced.
              "--y": `${10 + ((i * 37) % 75)}%`,
              "--s": `${size}px`,
              "--c": LOGO_CYCLE[color],
              "--t": `${seconds}s`,
              // Negative delays start each light partway up, so the slide never opens empty.
              "--d": `-${delay}s`,
            } as Vars
          }
        />
      ))}
    </span>
  );
}

/* --- What is bioinformatics?: symbols of the three fields, drifting ----- */

/**
 * [symbol, left %, top %, size px, seconds, delay seconds], grouped by field
 * and laid out like the Venn: statistics top left, code top right, DNA along
 * the bottom. They keep to the edges, clear of the diagram and the copy.
 */
type Glyph = [string, number, number, number, number, number];

const GLYPH_FIELDS: { color: string; glyphs: Glyph[] }[] = [
  {
    color: BRAND.navy,
    glyphs: [
      ["Σ", 4, 12, 46, 19, 0],
      ["μ", 18, 6, 30, 23, 6],
      ["σ²", 3, 38, 26, 21, 3],
      ["p < 0.05", 31, 5, 18, 25, 10],
      ["x̄", 43, 8, 28, 22, 14],
      ["χ²", 3, 62, 24, 24, 8],
      ["r²", 52, 16, 20, 20, 2],
      ["∫", 4, 86, 34, 26, 17],
    ],
  },
  {
    color: "#912a8c",
    glyphs: [
      ["{ }", 88, 9, 40, 20, 4],
      ["</>", 74, 22, 28, 24, 11],
      ["01", 98, 32, 26, 22, 1],
      ["λ", 98, 54, 34, 21, 15],
      ["if", 66, 10, 22, 25, 7],
      ["[ ]", 97, 76, 24, 23, 18],
      ["=>", 62, 7, 20, 19, 12],
    ],
  },
  {
    color: BRAND.tealInk,
    glyphs: [
      ["ATG", 18, 94, 26, 22, 5],
      ["GC", 33, 92, 22, 24, 13],
      ["TTAGC", 52, 92, 20, 21, 0],
      ["5′", 64, 90, 26, 25, 9],
      ["AUG", 78, 88, 24, 20, 16],
      ["CGTA", 88, 93, 18, 23, 3],
      ["3′", 44, 95, 22, 26, 20],
    ],
  },
];

function Glyphs() {
  return (
    <span className={styles.glyphs}>
      {GLYPH_FIELDS.flatMap(({ color, glyphs }) =>
        glyphs.map(([symbol, x, y, size, seconds, delay]) => (
          <span
            key={symbol}
            // Generated content, so the symbols never become page text.
            data-glyph={symbol}
            className={styles.glyph}
            style={
              {
                "--x": `${x}%`,
                "--y": `${y}%`,
                "--s": `${size}px`,
                "--c": color,
                "--t": `${seconds}s`,
                "--d": `-${delay}s`,
                // Every other one sways the other way.
                "--r": `${(x + y) % 2 ? -12 : 12}deg`,
              } as Vars
            }
          />
        )),
      )}
    </span>
  );
}

export function LightMotifArt({ motif }: { motif: LightMotif }) {
  switch (motif) {
    case "assembly":
      return <Assembly />;
    case "network":
      return <Network />;
    case "contours":
      return <Contours />;
    case "radar":
      return <Radar />;
    case "bokeh":
      return <Bokeh />;
    case "glyphs":
      return <Glyphs />;
  }
}
