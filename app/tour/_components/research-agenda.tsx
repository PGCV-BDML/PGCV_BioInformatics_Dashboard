import {
  Bug,
  Dna,
  Droplets,
  Earth,
  Fish,
  GitFork,
  HeartPulse,
  Microscope,
  PawPrint,
  ShieldCheck,
  Shrimp,
  Trees,
  Waves,
  Wheat,
  type LucideProps,
} from "lucide-react";
import { resolveText, type Audience } from "@/lib/tour";
import type { AgendaArea, AgendaIcon } from "@/lib/tour-agenda";
import { BRAND, CARD, LOGO } from "./brand";

/**
 * Oriental angelwing clam (Pholas orientalis): a long, wing-shaped valve with
 * radial ribs. Lucide has no bivalve, so it is drawn here in Lucide's style.
 */
function AngelwingClam({ size = 24, strokeWidth = 2, className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 17.5C2.5 15 4 10 9 7c4-2.4 9-3 11.2-1.4 1.8 1.4.6 4.6-3.2 7.4-4.2 3.1-9.6 6.4-13 4.5z" />
      <path d="M5 16.5c3-3.5 7-7 13-10" />
      <path d="M5.6 17c3.4-2.4 8.4-5.6 13.6-8.4" />
      <path d="M5 15.5c2-3.2 5.2-6.6 9.6-9" />
    </svg>
  );
}

const ICONS: Record<AgendaIcon, React.ComponentType<LucideProps>> = {
  health: HeartPulse,
  food: Wheat,
  conservation: Trees,
  microbes: Microscope,
  evolution: GitFork,
  shield: ShieldCheck,
  dna: Dna,
  fish: Fish,
  bug: Bug,
  paw: PawPrint,
  droplets: Droplets,
  river: Waves,
  globe: Earth,
  clam: AngelwingClam,
  shrimp: Shrimp,
};

/** Icon colour and the light tint behind the area icon. */
const AREA_COLORS: Record<string, { ink: string; tint: string }> = {
  health: { ink: LOGO.blue, tint: "#e3f0fa" },
  food: { ink: "#c76a00", tint: "#fff1e0" },
  conservation: { ink: BRAND.tealInk, tint: "#e1f7ef" },
  microbes: { ink: LOGO.magenta, tint: "#f8e6f2" },
  evolution: { ink: BRAND.navy, tint: "#e8e9f6" },
};

export function AgendaAreaCard({ area, audience }: { area: AgendaArea; audience: Audience }) {
  const { ink, tint } = AREA_COLORS[area.id] ?? AREA_COLORS.evolution!;
  const AreaIcon = ICONS[area.icon];
  return (
    <article className={`${CARD} flex h-full flex-col px-4 pb-3 pt-6 text-center`}>
      <span
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: tint, color: ink }}
        aria-hidden="true"
      >
        <AreaIcon className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 text-lg font-bold leading-tight text-[#2b3278]">{resolveText(area.name, audience)}</h3>
      <ul className="mt-3 flex flex-1 flex-col">
        {area.projects.map((project) => {
          const Icon = ICONS[project.icon];
          return (
            <li key={project.id} className="flex flex-1 flex-col items-center gap-1 border-t border-[#2b3278]/10 px-1 py-3">
              <Icon className="h-6 w-6 shrink-0" style={{ color: ink }} strokeWidth={1.75} aria-hidden="true" />
              <p className="text-sm font-semibold leading-snug text-[#333333]">{project.name}</p>
              <p className="text-xs leading-snug text-[#5b6770]">{resolveText(project.summary, audience)}</p>
              {audience === "technical" && (
                <p className="text-[11px] font-semibold leading-snug" style={{ color: ink }}>
                  {project.partners}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
