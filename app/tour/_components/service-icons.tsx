import { useId, type CSSProperties, type ReactNode } from "react";
import { LOGO } from "./brand";
import styles from "./tour-motion.module.css";

/*
 * Line icons for the services, drawn on a 48-unit grid with a 2.25 stroke.
 * Each has one accent in the logo gradient, an entrance played when its card
 * scrolls into view (see useReveal) and a small loop while hovered.
 */

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function IconFrame({ children, gradient }: { children: (gradientUrl: string) => ReactNode; gradient?: boolean }) {
  const id = `${useId()}-accent`;
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-10 w-10"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {gradient && (
        <defs>
          {/* User space, not bounding box: a flat line has zero height and would drop the gradient. */}
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="6" x2="42" y1="0" y2="0">
            <stop offset="0" stopColor={LOGO.orange} />
            <stop offset="0.5" stopColor={LOGO.magenta} />
            <stop offset="1" stopColor={LOGO.blue} />
          </linearGradient>
        </defs>
      )}
      {children(`url(#${id})`)}
    </svg>
  );
}

/** Short reads sliding together into one contig. */
function AssemblyIcon() {
  return (
    <IconFrame gradient>
      {(accent) => (
        <>
          <g className={styles.slideLeft} style={d(0)}>
            <line x1="8" y1="12" x2="24" y2="12" className={styles.bob} style={d(0)} />
          </g>
          <g className={styles.slideRight} style={d(90)}>
            <line x1="18" y1="19" x2="34" y2="19" className={styles.bob} style={d(150)} />
          </g>
          <g className={styles.slideLeft} style={d(180)}>
            <line x1="27" y1="26" x2="40" y2="26" className={styles.bob} style={d(300)} />
          </g>
          <path d="M8 36H40" stroke={accent} strokeWidth={4} pathLength={1} className={styles.draw} style={d(300)} />
        </>
      )}
    </IconFrame>
  );
}

const BARCODE_BARS = [
  { x: 14, w: 2.25, color: LOGO.orange },
  { x: 18, w: 3.5, color: LOGO.blue },
  { x: 22, w: 2.25, color: LOGO.red },
  { x: 26, w: 3.5, color: LOGO.magenta },
  { x: 30, w: 2.25, color: LOGO.orange },
  { x: 34, w: 2.25, color: LOGO.blue },
];

/** A barcode whose bars are the four nucleotide colours, with a scan line. */
function BarcodeIcon() {
  return (
    <IconFrame>
      {() => (
        <>
          <path d="M8 15v-5a2 2 0 0 1 2-2h5M33 8h5a2 2 0 0 1 2 2v5M40 33v5a2 2 0 0 1-2 2h-5M15 40h-5a2 2 0 0 1-2-2v-5" />
          {BARCODE_BARS.map((bar, i) => (
            <line
              key={bar.x}
              x1={bar.x}
              x2={bar.x}
              y1="16"
              y2="32"
              stroke={bar.color}
              strokeWidth={bar.w}
              strokeLinecap="butt"
              className={styles.rise}
              style={d(i * 50)}
            />
          ))}
          <line x1="11" y1="24" x2="37" y2="24" strokeWidth={1.5} className={styles.scan} />
        </>
      )}
    </IconFrame>
  );
}

/** A petri dish of mixed microbes that pop in and drift. */
function MicrobesIcon() {
  return (
    <IconFrame gradient>
      {(accent) => (
        <>
          <circle cx="24" cy="24" r="17" />
          <path d="M13 17a13 13 0 0 1 6-5" strokeOpacity={0.45} />
          <g className={styles.pop} style={d(0)}>
            <line x1="16" y1="22" x2="21.5" y2="18.5" strokeWidth={4.5} stroke={accent} className={styles.drift} />
          </g>
          <g className={styles.pop} style={d(80)}>
            <g className={styles.driftAlt}>
              <circle cx="29" cy="17" r="2.2" fill="currentColor" stroke="none" />
              <circle cx="32.6" cy="20.8" r="2.2" fill="currentColor" stroke="none" />
            </g>
          </g>
          <g className={styles.pop} style={d(160)}>
            <path d="M14.5 30.5q2-3 4 0t4 0t4 0" className={styles.drift} />
          </g>
          <g className={styles.pop} style={d(240)}>
            <circle cx="31" cy="30.5" r="3.2" className={styles.driftAlt} />
          </g>
        </>
      )}
    </IconFrame>
  );
}

const EXPRESSION_BARS = [
  { x: 13, top: 28 },
  { x: 20, top: 20 },
  { x: 27, top: 33 },
  { x: 34, top: 24 },
];

/** An mRNA wave over expression bars that switch up and down. */
function ExpressionIcon() {
  return (
    <IconFrame gradient>
      {(accent) => (
        <>
          <path
            d="M6 12c4-5 5-5 9 0s5 5 9 0 5-5 9 0 5 5 9 0"
            stroke={accent}
            pathLength={1}
            className={styles.draw}
          />
          <line x1="8" y1="40" x2="40" y2="40" strokeOpacity={0.4} />
          {EXPRESSION_BARS.map((bar, i) => (
            <g key={bar.x} className={styles.rise} style={d(250 + i * 70)}>
              <line
                x1={bar.x}
                x2={bar.x}
                y1={bar.top}
                y2="37"
                strokeWidth={4.5}
                className={styles.express}
                style={d(i * 220)}
              />
            </g>
          ))}
        </>
      )}
    </IconFrame>
  );
}

/** A laptop with a terminal prompt and a small helix on screen. */
function TrainingIcon() {
  return (
    <IconFrame gradient>
      {(accent) => (
        <>
          <rect x="9" y="9" width="30" height="21" rx="2.5" />
          <path d="M6 34h36l-3 4H9z" />
          <path d="M14 16l4 3.5-4 3.5" className={styles.slideLeft} style={d(100)} />
          <line x1="20.5" y1="23" x2="24" y2="23" className={styles.blink} />
          <path
            d="M29 13c5 3 5 10 0 13M35 13c-5 3-5 10 0 13"
            stroke={accent}
            strokeWidth={1.75}
            pathLength={1}
            className={styles.draw}
            style={d(250)}
          />
        </>
      )}
    </IconFrame>
  );
}

const SERVICE_ICONS: Record<string, () => ReactNode> = {
  "sequence-assembly": AssemblyIcon,
  "dna-barcoding": BarcodeIcon,
  metagenomics: MicrobesIcon,
  transcriptomics: ExpressionIcon,
  training: TrainingIcon,
};

export function hasServiceIcon(id: string): boolean {
  return id in SERVICE_ICONS;
}

/**
 * The service's icon tile. Services added to the content repo without a
 * drawn icon fall back to their two-letter code.
 */
export function ServiceIcon({ id, code, color, delay = 0 }: { id: string; code: string; color: string; delay?: number }) {
  const Icon = SERVICE_ICONS[id];
  return (
    <span
      className="flex h-16 w-16 items-center justify-center rounded-2xl"
      style={{ color, backgroundColor: `${color}12`, boxShadow: `inset 0 0 0 1px ${color}26`, "--base": `${delay}ms` } as CSSProperties}
      aria-hidden="true"
      data-service-icon={Icon ? id : "fallback"}
    >
      {Icon ? <Icon /> : <span className="text-lg font-black">{code}</span>}
    </span>
  );
}
