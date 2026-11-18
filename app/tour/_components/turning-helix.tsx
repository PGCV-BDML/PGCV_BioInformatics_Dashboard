import type { CSSProperties } from "react";
import styles from "./turning-helix.module.css";

export type Base = "A" | "C" | "G" | "T";
export const PARTNER: Record<Base, Base> = { A: "T", T: "A", C: "G", G: "C" };
/** The decks' base colours (A mint, C sky, G gold, T pink), set on every helix as --base-a and so on. */
export const BASE_COLOR: Record<Base, string> = {
  A: "var(--base-a)",
  C: "var(--base-c)",
  G: "var(--base-g)",
  T: "var(--base-t)",
};

/* An illustration, not real data: the strand the pairs are read from. */
const STRAND = "ATGCGTACCGGATTACAGCTTGACCGATCG";

/** Pairs sit 30px apart along the axis, each a twelfth of a turn on from the last: a full turn every 12 seconds. */
export const PAIR_GAP = 30;
const TURN_S = 12;

/** Where a helix lies on the canvas. */
export type HelixPlacement = {
  /** The middle of its axis. */
  x: number;
  y: number;
  /** How many base pairs: the axis is 30px long for each. */
  pairs: number;
  /** Degrees the axis is turned from upright, clockwise: 14 leans its top to the right, -90 lays it left to right. */
  tilt: number;
  /** How far the beads swing either side of the axis; each rung is twice as wide. */
  halfWidth?: number;
};

const DEFAULT_HALF_WIDTH = 78;

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

/** Where a bead stands at a point in its turn: across with cos, forward (bigger, brighter) with sin. */
function beadAt(progress: number, halfWidth: number) {
  const angle = progress * 2 * Math.PI;
  const depth = Math.sin(angle);
  return {
    "--x": `${(halfWidth * Math.cos(angle)).toFixed(1)}px`,
    "--k": (0.9 + 0.3 * depth).toFixed(3),
    "--o": (depth >= 0 ? 0.8 + 0.2 * depth : 0.8 + 0.4 * depth).toFixed(3),
    "--z": depth > 0.3 ? 3 : depth < -0.3 ? 1 : 2,
  };
}

/** The centre of pair `i` on the canvas, after the helix's tilt. */
export function pairCentre({ x, y, pairs, tilt }: HelixPlacement, i: number): [number, number] {
  const turn = (tilt * Math.PI) / 180;
  const fromMiddle = i * PAIR_GAP - (pairs * PAIR_GAP) / 2;
  return [x - fromMiddle * Math.sin(turn), y + fromMiddle * Math.cos(turn)];
}

/**
 * A double helix turning on its axis, its beads in the decks' base colours.
 * Without motion it holds still, mid-turn. Hidden from assistive technology.
 */
export function TurningHelix({ placement, className = "" }: { placement: HelixPlacement; className?: string }) {
  const { x, y, pairs, tilt, halfWidth = DEFAULT_HALF_WIDTH } = placement;
  const length = pairs * PAIR_GAP;
  return (
    <div
      className={`${styles.helix} ${className}`}
      style={css({ left: `${x}px`, top: `${y - length / 2}px`, height: `${length}px`, transform: `rotate(${tilt}deg)`, "--hw": `${halfWidth}px` })}
      data-helix-pairs={pairs}
      aria-hidden="true"
    >
      {Array.from({ length: pairs }, (_, i) => {
        const base = STRAND[i % STRAND.length] as Base;
        const partner = PARTNER[base];
        // Each pair is a twelfth of a turn on from the one above.
        const progress = (i % TURN_S) / TURN_S;
        return (
          <div key={i} className={styles.pair} style={{ top: i * PAIR_GAP }}>
            <span
              className={styles.rung}
              style={css({
                "--c1": BASE_COLOR[base],
                "--c2": BASE_COLOR[partner],
                "--r": Math.cos(progress * 2 * Math.PI).toFixed(3),
                "--d": `${-i}s`,
              })}
            />
            <span className={styles.bead} style={css({ "--c": BASE_COLOR[base], ...beadAt(progress, halfWidth), "--d": `${-i}s` })} />
            <span
              className={styles.bead}
              style={css({ "--c": BASE_COLOR[partner], ...beadAt(progress + 0.5, halfWidth), "--d": `${-i - TURN_S / 2}s` })}
            />
          </div>
        );
      })}
    </div>
  );
}
