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
import type { Audience } from "@/lib/tour";
import type { AgendaArea, AgendaIcon } from "@/lib/tour-agenda";
import { BRAND, CARD, LOGO } from "./brand";
import { TourCopy } from "./tour-copy";

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

/**
 * One research area and its projects. On a phone, centred; on the canvas, a
 * narrow column of five, so the icon sits beside the name and the projects
 * keep their words (their icons drop out, except for Visual, which has no words).
 */
export function AgendaAreaCard({ area, audience }: { area: AgendaArea; audience: Audience }) {
  const { ink, tint } = AREA_COLORS[area.id] ?? AREA_COLORS.evolution!;
  const AreaIcon = ICONS[area.icon];
  const visual = audience === "visual";
  return (
    <article className={`${CARD} flex h-full flex-col px-4 pb-3 pt-6 text-center ${visual ? "" : "canvas:pt-[18px] canvas:text-left"}`}>
      <div className={`flex flex-col items-center ${visual ? "" : "canvas:flex-row canvas:gap-2.5"}`}>
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${visual ? "" : "canvas:h-10 canvas:w-10"}`}
          style={{ backgroundColor: tint, color: ink }}
          aria-hidden="true"
        >
          <AreaIcon className={`h-8 w-8 ${visual ? "" : "canvas:h-5 canvas:w-5"}`} strokeWidth={1.75} />
        </span>
        <h3 className={`mt-3 text-lg font-bold leading-tight text-[#2b3278] canvas:text-[20px] ${visual ? "" : "canvas:mt-0"}`}>
          <TourCopy text={area.name} audience={audience} />
        </h3>
      </div>
      <ul className="mt-3 flex flex-1 flex-col canvas:mt-2">
        {area.projects.map((project) => {
          const Icon = ICONS[project.icon];
          return (
            <li
              key={project.id}
              className={`flex flex-1 flex-col items-center gap-1 border-t border-[#2b3278]/10 px-1 py-3 ${visual ? "" : "canvas:flex-none canvas:items-start canvas:gap-0.5 canvas:px-0 canvas:py-2.5"}`}
            >
              <Icon className={`h-6 w-6 shrink-0 ${visual ? "canvas:h-9 canvas:w-9" : "canvas:hidden"}`} style={{ color: ink }} strokeWidth={1.75} aria-hidden="true" />
              <p className="text-sm font-semibold leading-snug text-[#333333] canvas:text-[18px] canvas:font-bold canvas:text-[#2b3278]">{project.name}</p>
              {!visual && (
                // Technical's full project titles run to four lines: on the canvas, as in the deck, the name and partners stand for them.
                <p className={`text-xs leading-snug text-[#5b6770] canvas:text-[16px] ${audience === "technical" ? "canvas:hidden" : ""}`}>
                  <TourCopy text={project.summary} audience={audience} />
                </p>
              )}
              {audience === "technical" && (
                <p className="text-[11px] font-semibold leading-snug canvas:mt-0.5 canvas:text-[14px]" style={{ color: ink }}>
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
