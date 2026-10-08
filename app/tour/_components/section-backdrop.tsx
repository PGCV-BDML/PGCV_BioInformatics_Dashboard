import { useId, type CSSProperties } from "react";
import { BRAND, LOGO } from "./brand";
import { LightMotifArt, type LightMotif } from "./light-motifs";
import { useOnScreen } from "./use-reveal";
import styles from "./backdrop.module.css";

/*
 * Decorative backgrounds for the tour sections. Everything here is
 * aria-hidden, ignores the pointer and uses no images. The parent must be
 * `relative` and the content above it `relative` too.
 */

type Blob = { color: string; size: string; x: string; y: string; alpha: number; seconds: number; alt?: boolean };

const HERO_BLOBS: Blob[] = [
  { color: LOGO.magenta, size: "70vw", x: "12%", y: "8%", alpha: 0.55, seconds: 26 },
  { color: LOGO.blue, size: "55vw", x: "92%", y: "30%", alpha: 0.45, seconds: 34, alt: true },
  { color: LOGO.orange, size: "38vw", x: "72%", y: "92%", alpha: 0.3, seconds: 30 },
  { color: BRAND.teal, size: "34vw", x: "6%", y: "100%", alpha: 0.22, seconds: 38, alt: true },
];

const CONTACT_BLOBS: Blob[] = [
  { color: LOGO.blue, size: "60vw", x: "8%", y: "90%", alpha: 0.4, seconds: 30, alt: true },
  { color: LOGO.magenta, size: "55vw", x: "88%", y: "10%", alpha: 0.45, seconds: 26 },
  { color: LOGO.orange, size: "30vw", x: "60%", y: "105%", alpha: 0.25, seconds: 36 },
];

/** Deterministic A/C/G/T rows, so server and client render the same text. */
function sequenceRows(count: number, length: number): string[] {
  let seed = 20_240_617;
  const next = () => (seed = (Math.imul(seed, 1_103_515_245) + 12_345) >>> 0);
  return Array.from({ length: count }, () =>
    // High bits: the low bits of a power-of-two LCG repeat every few steps.
    Array.from({ length }, () => "ACGT"[(next() >>> 16) % 4]).join(""),
  );
}

const SEQUENCE_ROWS = sequenceRows(16, 160);

function Aurora({ blobs }: { blobs: Blob[] }) {
  return blobs.map((blob, i) => (
    <span
      key={i}
      className={`${styles.blob} ${blob.alt ? styles.blobAlt : ""}`}
      style={
        {
          "--c": blob.color,
          "--s": blob.size,
          "--x": blob.x,
          "--y": blob.y,
          "--a": blob.alpha,
          "--t": `${blob.seconds}s`,
        } as CSSProperties
      }
    />
  ));
}

function SequenceTexture() {
  return (
    <span className={styles.sequence}>
      {SEQUENCE_ROWS.map((row, i) => (
        <span
          key={i}
          // Two copies so the row can scroll by half its width and loop seamlessly.
          data-seq={row + row}
          className={`${styles.row} ${i % 2 ? styles.rowReverse : ""}`}
          style={{ "--t": `${90 + ((i * 17) % 50)}s` } as CSSProperties}
        />
      ))}
    </span>
  );
}

/** Each light section takes the next glow colour and alternates corners. */
const GLOWS = [LOGO.magenta, LOGO.blue, BRAND.teal, LOGO.orange];

function LightLayers({ index }: { index: number }) {
  const right = index % 2 === 1;
  return (
    <>
      <span
        className={styles.dots}
        style={{ "--mx": right ? "100%" : "0%", "--my": right ? "0%" : "100%" } as CSSProperties}
      />
      <span
        className={styles.glow}
        style={
          {
            "--c": GLOWS[index % GLOWS.length],
            "--gx": right ? "95%" : "5%",
            "--gy": right ? "10%" : "90%",
          } as CSSProperties
        }
      />
    </>
  );
}

/** Right-angled traces from the edges toward the middle, in a 1440×900 box. */
const TRACES = [
  { d: "M1440 120H1100L1060 160H760", end: [760, 160], seconds: 7, delay: 0 },
  { d: "M1440 300H1240L1200 260H980", end: [980, 260], seconds: 9, delay: 2.5 },
  { d: "M1440 780H1180L1140 740H900L860 700H660", end: [660, 700], seconds: 8, delay: 1.2 },
  { d: "M0 830H220L260 790H520", end: [520, 790], seconds: 10, delay: 4 },
  { d: "M0 70H180L220 110H420", end: [420, 110], seconds: 8.5, delay: 5.5 },
];

const RACK_LIGHTS = Array.from({ length: 12 }, (_, i) => ({
  x: 1392 + (i % 2) * 14,
  y: 420 + Math.floor(i / 2) * 18,
  color: i % 3 === 0 ? BRAND.deepTeal : BRAND.teal,
  delay: (i * 0.37) % 2.8,
}));

function Circuit() {
  const pulseId = `${useId()}-pulse`;
  return (
    <svg className={styles.circuit} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs>
        <linearGradient id={pulseId} x1="0" x2="1">
          <stop offset="0" stopColor={BRAND.teal} />
          <stop offset="1" stopColor={BRAND.deepTeal} />
        </linearGradient>
      </defs>
      {TRACES.map((trace) => (
        <g key={trace.d} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={trace.d} className={styles.trace} />
          <path
            d={trace.d}
            pathLength={1}
            stroke={`url(#${pulseId})`}
            strokeWidth={3}
            className={styles.pulse}
            style={{ "--t": `${trace.seconds}s`, "--d": `${trace.delay}s` } as CSSProperties}
          />
          <circle cx={trace.end[0]} cy={trace.end[1]} r="5" className={styles.node} />
        </g>
      ))}
      {RACK_LIGHTS.map((light) => (
        <rect
          key={`${light.x}-${light.y}`}
          x={light.x}
          y={light.y}
          width="8"
          height="4"
          rx="2"
          fill={light.color}
          className={styles.light}
          style={{ "--d": `${light.delay}s` } as CSSProperties}
        />
      ))}
    </svg>
  );
}

export type BackdropVariant = "hero" | "contact" | "light" | "infrastructure";

export function SectionBackdrop({
  variant,
  index = 0,
  motif,
}: {
  variant: BackdropVariant;
  index?: number;
  /** Light sections only: the slide's own background art. */
  motif?: LightMotif;
}) {
  const [ref, onScreen] = useOnScreen<HTMLSpanElement>();
  return (
    <span ref={ref} className={styles.root} data-offscreen={onScreen === false ? "" : undefined} aria-hidden="true">
      {variant === "hero" && (
        <>
          <Aurora blobs={HERO_BLOBS} />
          <SequenceTexture />
        </>
      )}
      {variant === "contact" && (
        <>
          <Aurora blobs={CONTACT_BLOBS} />
          <SequenceTexture />
        </>
      )}
      {variant === "light" && (
        <>
          <LightLayers index={index} />
          {motif && <LightMotifArt motif={motif} />}
        </>
      )}
      {variant === "infrastructure" && (
        <>
          <LightLayers index={index} />
          <Circuit />
        </>
      )}
    </span>
  );
}
