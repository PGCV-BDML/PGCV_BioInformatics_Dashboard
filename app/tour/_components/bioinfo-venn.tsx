import { Fragment, type CSSProperties } from "react";
import { ChartColumn, Dna, Laptop, type LucideIcon } from "lucide-react";
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

/** Without `labels`, only the "Bioinformatics" pill in the middle is written on it. */
export function BioinfoVenn({ className = "", labels = true }: { className?: string; labels?: boolean }) {
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
      {labels && (
        <>
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
        </>
      )}
      {/* With nothing else written on it, the pill can be read from across the room. */}
      <g className={styles.pop} style={delay(1250)}>
        {labels ? (
          <rect x={146} y={136} width={108} height={30} rx={15} fill={BRAND.navy} />
        ) : (
          <rect x={102} y={128} width={196} height={48} rx={24} fill={BRAND.navy} />
        )}
        <text x={200} y={labels ? 156 : 160} textAnchor="middle" fontSize={labels ? 13 : 23} fontWeight={800} fill="#fff">
          Bioinformatics
        </text>
      </g>
    </svg>
  );
}

const FIELD_ICONS: Record<IntroFieldId, LucideIcon> = {
  statistics: ChartColumn,
  computing: Laptop,
  biology: Dna,
};

/** Biology asks the question; computers and statistics answer it. */
const EQUATION_ORDER: IntroFieldId[] = ["biology", "computing", "statistics"];

/** The Visual audience's version of the slide: biology + computer science + statistics = the Venn. */
export function BioinfoEquation() {
  const fields = EQUATION_ORDER.map((id) => INTRO_FIELDS.find((f) => f.id === id)!);
  const sign = "text-4xl font-black text-[#2b3278]/40 md:text-6xl";
  return (
    <div
      role="img"
      aria-label={`${fields.map((f) => f.name).join(" plus ")} make bioinformatics.`}
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-6 md:gap-x-5"
    >
      {fields.map((field, i) => {
        const { fill, ink } = INTRO_FIELD_COLORS[field.id];
        const Icon = FIELD_ICONS[field.id];
        return (
          <Fragment key={field.id}>
            {i > 0 && (
              <span className={`${sign} ${styles.fadeIn}`} style={delay(320 + i * 220)}>
                +
              </span>
            )}
            <div className={`flex flex-col items-center gap-3 ${styles.pop}`} style={delay(200 + i * 220)}>
              <span
                className="flex h-28 w-28 items-center justify-center rounded-full border-[3px] md:h-36 md:w-36"
                style={{ borderColor: fill, backgroundColor: `${fill}24`, color: ink }}
              >
                <Icon className="h-14 w-14 md:h-20 md:w-20" strokeWidth={1.5} />
              </span>
              <span className="text-lg font-bold md:text-2xl" style={{ color: ink }}>
                {field.name}
              </span>
            </div>
          </Fragment>
        );
      })}
      {/* Kept together, so a wrap never leaves "=" at the end of a line. */}
      <div className="flex items-center gap-4 md:gap-5">
        <span className={`${sign} ${styles.fadeIn}`} style={delay(980)}>
          =
        </span>
        <BioinfoVenn labels={false} className="w-56 md:w-72" />
      </div>
    </div>
  );
}
