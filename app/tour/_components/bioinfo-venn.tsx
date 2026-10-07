import type { CSSProperties } from "react";
import { INTRO_FIELDS, INTRO_OVERLAPS, type IntroFieldId } from "@/lib/tour-intro";
import { BRAND, SERVICE_HEX } from "./brand";
import styles from "./tour-motion.module.css";

/** Fill and text colour per circle; teal is too light for text, so its labels use tealInk. */
export const INTRO_FIELD_COLORS: Record<IntroFieldId, { fill: string; ink: string }> = {
  statistics: { fill: BRAND.navy, ink: BRAND.navy },
  computing: { fill: SERVICE_HEX.magenta, ink: SERVICE_HEX.magenta },
  biology: { fill: BRAND.teal, ink: BRAND.tealInk },
};

/** Circles in a 400×340 box, with each label placed inside its own region. */
const CIRCLES: Record<IntroFieldId, { cx: number; cy: number; label: [number, number] }> = {
  statistics: { cx: 150, cy: 125, label: [100, 92] },
  computing: { cx: 250, cy: 125, label: [300, 92] },
  biology: { cx: 200, cy: 210, label: [200, 290] },
};
const R = 110;

const OVERLAP_AT: Record<string, [number, number]> = {
  "statistics+computing": [200, 72],
  "statistics+biology": [140, 206],
  "computing+biology": [260, 200],
};

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function BioinfoVenn({ className = "" }: { className?: string }) {
  const label = `Venn diagram: ${INTRO_FIELDS.map((f) => f.name).join(", ")} overlap. ${INTRO_OVERLAPS.map(
    (o) => o.name,
  ).join(", ")} sit where two meet; bioinformatics is where all three meet.`;
  return (
    <svg viewBox="0 0 400 340" role="img" aria-label={label} className={className}>
      {INTRO_FIELDS.map((field, i) => {
        const { cx, cy } = CIRCLES[field.id];
        const { fill, ink } = INTRO_FIELD_COLORS[field.id];
        return (
          <circle
            key={field.id}
            cx={cx}
            cy={cy}
            r={R}
            fill={fill}
            fillOpacity={field.id === "biology" ? 0.2 : 0.13}
            stroke={ink}
            strokeWidth={2}
            className={styles.pop}
            style={delay(200 + i * 180)}
          />
        );
      })}
      <g fontWeight={800} fontSize={16} textAnchor="middle">
        {INTRO_FIELDS.map((field, i) => {
          const [x, y] = CIRCLES[field.id].label;
          const words = field.name.split(" ");
          return (
            <text key={field.id} x={x} y={y} fill={INTRO_FIELD_COLORS[field.id].ink} className={styles.fadeIn} style={delay(420 + i * 180)}>
              {words.map((word, j) => (
                <tspan key={word} x={x} dy={j ? 18 : 0}>
                  {word}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>
      <g fontWeight={600} fontSize={11} textAnchor="middle" fill="#5b6770">
        {INTRO_OVERLAPS.map((overlap, i) => {
          const [x, y] = OVERLAP_AT[overlap.fields.join("+")]!;
          const words = overlap.name.split(" ");
          return (
            <text key={overlap.name} x={x} y={y} className={styles.fadeIn} style={delay(900 + i * 120)}>
              {words.map((word, j) => (
                <tspan key={word} x={x} dy={j ? 13 : 0}>
                  {word}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>
      <g className={styles.pop} style={delay(1250)}>
        <rect x={146} y={136} width={108} height={30} rx={15} fill={BRAND.navy} />
        <text x={200} y={156} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff">
          Bioinformatics
        </text>
      </g>
    </svg>
  );
}
