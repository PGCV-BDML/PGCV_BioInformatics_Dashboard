import type { CSSProperties } from "react";
import { BRAND, LOGO } from "./brand";
import { useOnScreen } from "./use-reveal";
import styles from "./backdrop.module.css";

/*
 * Decorative backgrounds for the tour's dark slides (welcome and contact).
 * Everything here is aria-hidden, ignores the pointer and uses no images. The
 * parent must be `relative` and the content above it `relative` too. Sizes are
 * in --u: 1vw on a phone, a hundredth of the canvas's width on the canvas.
 */

type Blob = { color: string; size: string; x: string; y: string; alpha: number; seconds: number; alt?: boolean };

const HERO_BLOBS: Blob[] = [
  { color: LOGO.magenta, size: "calc(70 * var(--u))", x: "12%", y: "8%", alpha: 0.55, seconds: 26 },
  { color: LOGO.blue, size: "calc(55 * var(--u))", x: "92%", y: "30%", alpha: 0.45, seconds: 34, alt: true },
  { color: LOGO.orange, size: "calc(38 * var(--u))", x: "72%", y: "92%", alpha: 0.3, seconds: 30 },
  { color: BRAND.teal, size: "calc(34 * var(--u))", x: "6%", y: "100%", alpha: 0.22, seconds: 38, alt: true },
];

const CONTACT_BLOBS: Blob[] = [
  { color: LOGO.blue, size: "calc(60 * var(--u))", x: "8%", y: "90%", alpha: 0.4, seconds: 30, alt: true },
  { color: LOGO.magenta, size: "calc(55 * var(--u))", x: "88%", y: "10%", alpha: 0.45, seconds: 26 },
  { color: LOGO.orange, size: "calc(30 * var(--u))", x: "60%", y: "105%", alpha: 0.25, seconds: 36 },
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

export type BackdropVariant = "hero" | "contact";

export function SectionBackdrop({ variant }: { variant: BackdropVariant }) {
  const [ref, onScreen] = useOnScreen<HTMLSpanElement>();
  return (
    <span ref={ref} className={styles.root} data-offscreen={onScreen === false ? "" : undefined} aria-hidden="true">
      <Aurora blobs={variant === "hero" ? HERO_BLOBS : CONTACT_BLOBS} />
      <SequenceTexture />
    </span>
  );
}
