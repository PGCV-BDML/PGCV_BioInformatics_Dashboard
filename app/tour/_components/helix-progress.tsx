import { useId } from "react";
import { BRAND, LOGO } from "./brand";

const STEP = 22;
const PAD = 10;
const MID = 15;
const AMPLITUDE = 9;
/** One full twist every four slides. */
const WAVELENGTH = STEP * 4;

function strand(width: number, sign: 1 | -1): string {
  const points: string[] = [];
  for (let x = 0; x <= width; x += 2) {
    const y = MID + sign * AMPLITUDE * Math.sin(((x - PAD) / WAVELENGTH) * 2 * Math.PI);
    points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`);
  }
  return points.join("");
}

/**
 * Present-mode progress: a short double helix with one rung per slide.
 * Rungs light up as the tour goes on; each one jumps to its slide.
 */
export function HelixProgress({
  labels,
  current,
  onSelect,
}: {
  labels: string[];
  current: number;
  onSelect: (index: number) => void;
}) {
  const id = useId();
  const width = PAD * 2 + STEP * (labels.length - 1);
  return (
    <div className="relative" style={{ width, height: 30 }}>
      <svg viewBox={`0 0 ${width} 30`} width={width} height={30} fill="none" strokeLinecap="round" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-strand`} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
            <stop offset="0" stopColor={LOGO.orange} />
            <stop offset="0.5" stopColor={LOGO.magenta} />
            <stop offset="1" stopColor="#2f9ae8" />
          </linearGradient>
        </defs>
        <path d={strand(width, -1)} stroke="white" strokeOpacity={0.25} strokeWidth={1.5} />
        <path d={strand(width, 1)} stroke={`url(#${id}-strand)`} strokeWidth={2} />
        {labels.map((label, i) => {
          const x = PAD + i * STEP;
          const reach = Math.abs(AMPLITUDE * Math.sin(((x - PAD) / WAVELENGTH) * 2 * Math.PI));
          // Rungs at a crossover would vanish; keep a minimum so every slide shows.
          const half = Math.max(3, reach - 2);
          return (
            <line
              key={label}
              x1={x}
              x2={x}
              y1={MID - half}
              y2={MID + half}
              stroke={i <= current ? BRAND.teal : "white"}
              strokeOpacity={i <= current ? 1 : 0.3}
              strokeWidth={i === current ? 4 : 2.5}
              className="transition-[stroke,stroke-opacity,stroke-width] duration-300"
            />
          );
        })}
      </svg>
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Go to ${label}`}
          aria-current={i === current ? "step" : undefined}
          className="absolute top-0 h-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#12ca99]"
          style={{ left: PAD + i * STEP - STEP / 2, width: STEP }}
        />
      ))}
    </div>
  );
}
