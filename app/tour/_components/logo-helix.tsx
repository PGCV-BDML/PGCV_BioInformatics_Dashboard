import { useId, type CSSProperties } from "react";
import { LOGO } from "./brand";
import styles from "./tour-motion.module.css";

/*
 * The double helix from the PGC Visayas logo, traced from pgcv_logo.png in
 * its own 1440×611 coordinate space: one crossover, four rungs either side,
 * the warm strand ending low and the cool strand arcing up over "PGC".
 */
const WARM_STRAND = "M262 232 C 330 224, 400 232, 520 284 S 700 360, 785 366";
const COOL_STRAND =
  "M80 350 C 200 372, 330 368, 520 284 C 710 200, 900 70, 1080 66 C 1180 62, 1270 95, 1315 125";
/** [x, top, bottom] for each rung. */
const RUNGS = [
  [306, 250, 341],
  [353, 250, 325],
  [399, 258, 311],
  [446, 269, 297],
  [595, 265, 297],
  [646, 238, 323],
  [697, 213, 334],
  [748, 187, 341],
] as const;

type Stop = [offset: number, color: string];

const WARM: Stop[] = [
  [0, LOGO.orange],
  [0.4, LOGO.red],
  [0.55, LOGO.crimson],
  [0.72, LOGO.magenta],
  [1, "#772077"],
];
const COOL: Stop[] = [
  [0, "#93196e"],
  [0.58, LOGO.purple],
  [0.73, LOGO.violet],
  [0.79, LOGO.indigo],
  [0.93, LOGO.blue],
];
// The cool strand's indigo end disappears on navy, so lift it on dark grounds.
const COOL_ON_DARK: Stop[] = [
  [0, "#b8338f"],
  [0.58, "#a55bc2"],
  [0.79, "#6f73d6"],
  [0.93, "#2f9ae8"],
];
const RUNG_STOPS: Stop[] = [
  [0, "#ee4421"],
  [0.35, "#dd3123"],
  [0.65, "#bb215f"],
  [1, "#972587"],
];

function Gradient({ id, x1, x2, stops }: { id: string; x1: number; x2: number; stops: Stop[] }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1="0" y2="0">
      {stops.map(([offset, color]) => (
        <stop key={offset} offset={offset} stopColor={color} />
      ))}
    </linearGradient>
  );
}

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function LogoHelix({
  className,
  onDark,
  animate,
  strokeWidth = 13,
}: {
  className?: string;
  onDark?: boolean;
  /** Draw the strands in, then pop the rungs, once on mount. */
  animate?: boolean;
  strokeWidth?: number;
}) {
  const id = useId();
  const warm = `${id}-warm`;
  const cool = `${id}-cool`;
  const rung = `${id}-rung`;
  return (
    <svg
      viewBox="60 40 1275 345"
      className={className}
      aria-hidden="true"
      fill="none"
      strokeLinecap="round"
      strokeWidth={strokeWidth}
    >
      <defs>
        <Gradient id={warm} x1={262} x2={785} stops={WARM} />
        <Gradient id={cool} x1={80} x2={1315} stops={onDark ? COOL_ON_DARK : COOL} />
        <Gradient id={rung} x1={306} x2={748} stops={RUNG_STOPS} />
      </defs>
      <path
        d={COOL_STRAND}
        stroke={`url(#${cool})`}
        pathLength={1}
        className={animate ? styles.draw : undefined}
      />
      <path
        d={WARM_STRAND}
        stroke={`url(#${warm})`}
        pathLength={1}
        className={animate ? styles.draw : undefined}
        style={animate ? delay(200) : undefined}
      />
      {RUNGS.map(([x, y1, y2], i) => (
        <line
          key={x}
          x1={x}
          x2={x}
          y1={y1}
          y2={y2}
          stroke={`url(#${rung})`}
          className={animate ? styles.rung : undefined}
          style={animate ? delay(700 + i * 60) : undefined}
        />
      ))}
    </svg>
  );
}
