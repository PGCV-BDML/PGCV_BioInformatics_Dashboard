/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Cpu, HardDrive, MemoryStick, Pause, Play, RotateCw, type LucideIcon } from "lucide-react";
import { resolveText, tourAssetUrl, type Audience, type TourContent, type TourService } from "@/lib/tour";
import type { TourCovidStats } from "@/lib/tour-stats";
import { formatMonth, type TourPhyloSummary } from "@/lib/tour-phylo";
import type { TourVirusSummary } from "@/lib/tour-virus";
import type { VirusView } from "./virus-viewer";
import { BRAND, CARD, SERVICE_HEX } from "./brand";
import { FeaturedProject } from "./project-feature";
import { LogoHelix } from "./logo-helix";
import { SectionBackdrop } from "./section-backdrop";
import type { LightMotif } from "./light-motifs";
import { ServiceIcon } from "./service-icons";
import { SocialIcon, hasSocialIcon } from "./social-icons";
import { useReveal } from "./use-reveal";
import { CountUp } from "./count-up";
import { DoiQr } from "./doi-qr";
import styles from "./tour-motion.module.css";

// ~11k-node SVG and its data load after the rest of the tour.
const PhyloTree = dynamic(() => import("./phylo-tree").then((m) => m.PhyloTree), {
  ssr: false,
  loading: () => (
    <div className="mt-8 flex h-[480px] items-center justify-center rounded-2xl border border-[#2b3278]/10 bg-white text-sm text-[#5b6770]">
      Loading the variant tree…
    </div>
  ),
});

// WebGL viewer and its ~2 MB of model data load only near the slide.
const VirusViewer = dynamic(() => import("./virus-viewer").then((m) => m.VirusViewer), { ssr: false });

type SectionProps = { content: TourContent; audience: Audience };

/** Entrance delay; `styles.enter` and friends read it as --d. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
/** Cards come in one after another, capped so long lists don't drag. */
const stagger = (i: number, start = 200) => delay(start + Math.min(i, 8) * 60);

/*
 * Present mode (data-presenting on the tour root) targets a wide, short
 * screen such as a 1280×720 projector: content spans the full width, with
 * less padding and more items per row, and slide-fit.ts shrinks whatever
 * still doesn't fit. `!` beats the responsive classes these override.
 */
const PRESENT_WIDE = "group-data-[presenting]/tour:max-w-[110rem]! group-data-[presenting]/tour:py-10!";
const PRESENT_GAP = "group-data-[presenting]/tour:mt-6!";
/**
 * As many columns as fit, so a row of cards becomes one line on a wide
 * screen. Written out in full: Tailwind only builds classes it finds as is.
 */
const PRESENT_COLUMNS = {
  services: "group-data-[presenting]/tour:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]!",
  trainings: "group-data-[presenting]/tour:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]!",
  team: "group-data-[presenting]/tour:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]!",
};


function Eyebrow({ index, children, onDark }: { index: number; children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      className={`flex items-center gap-3 font-quicksand text-xs font-bold uppercase tracking-[0.2em] ${onDark ? "text-[#12ca99]" : "text-[#0a7558]"}`}
    >
      <span className={`h-0.5 w-8 rounded-full bg-[#12ca99] ${styles.growX}`} aria-hidden="true" />
      <span className={styles.fadeIn} style={delay(150)}>
        {String(index).padStart(2, "0")} · {children}
      </span>
    </p>
  );
}

function SectionHeading({ title, onDark }: { title: string; onDark?: boolean }) {
  return (
    <h2
      className={`mt-3 text-3xl font-black tracking-tight md:text-[44px] md:leading-[1.1] ${onDark ? "text-white" : "text-[#2b3278]"} ${styles.enter}`}
      style={delay(80)}
    >
      {title}
    </h2>
  );
}

/**
 * Wrapper for the light sections: a dot-grid-and-glow backdrop, plus a thin
 * logo-gradient rule when the section directly follows another light one
 * (tour-experience marks those with data-tone="light").
 */
function LightSection({
  index,
  lavender,
  motif,
  className = "py-16 md:py-24",
  children,
}: {
  index: number;
  lavender?: boolean;
  motif?: LightMotif;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden ${lavender ? "bg-[#f0e8f2]" : ""}`}>
      <SectionBackdrop variant="light" index={index} motif={motif} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 hidden px-4 md:px-8 [[data-tone=light]+[data-tone=light]_&]:block"
      >
        <div className="mx-auto h-px max-w-6xl bg-[linear-gradient(90deg,transparent,#ff8601,#9c1f7a,#0176c3,transparent)] opacity-50" />
      </div>
      <div className={`relative mx-auto w-full max-w-6xl px-4 md:px-8 ${className} ${PRESENT_WIDE}`}>{children}</div>
    </div>
  );
}

export function HeroSection({ content, audience }: SectionProps) {
  const { hero } = content;
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2b3278_0%,#5e205e_45%,#2a7797_85%,#12ca99_130%)] text-white">
      <SectionBackdrop variant="hero" />
      {/* Keeps the headline side dark enough for white text over the aurora. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(28,33,82,0.7)_0%,rgba(28,33,82,0.35)_50%,transparent_80%)]"
        aria-hidden="true"
      />
      <LogoHelix
        onDark
        animate
        className="pointer-events-none absolute -right-28 top-10 hidden w-[560px] opacity-35 md:block xl:-right-20 xl:w-[720px] xl:opacity-70"
      />
      {/* m-auto: in Present mode the slide fills the screen, so the content
          centres itself and the accent bar below stays on the bottom edge. */}
      <div className="relative m-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0d8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#12ca99]" aria-hidden="true" />
          {hero.eyebrow}
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl md:leading-[1.05]">
          {hero.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
          {resolveText(hero.intro, audience)}
        </p>
        {hero.facts.length > 0 && (
          <dl className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {hero.facts.map((fact, i) => (
              <div
                key={fact.label}
                className={`flex flex-col-reverse rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 backdrop-blur-sm ${styles.enter}`}
                style={stagger(i, 400)}
              >
                <dt className="mt-1 text-sm font-medium text-white/75">{fact.label}</dt>
                {/* No count-up here: the hero must not wait for JavaScript to show its numbers. */}
                <dd className="text-3xl font-black tracking-tight md:text-4xl">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="relative h-1.5 bg-[linear-gradient(90deg,#ff8601,#c51b4a,#8a2990,#0176c3)]" aria-hidden="true" />
    </div>
  );
}

function ServiceCard({ service, audience, order }: { service: TourService; audience: Audience; order: number }) {
  const [ref, reveal] = useReveal<HTMLLIElement>();
  const color = SERVICE_HEX[service.color];
  return (
    <li
      ref={ref}
      data-reveal={reveal}
      className={`${CARD} ${styles.hoverable} ${styles.enter} relative flex flex-col gap-3 overflow-hidden p-7 transition-transform duration-300 ease-tour hover:-translate-y-1`}
      style={delay((order % 3) * 90)}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} aria-hidden="true" />
      {/* Cards in the same row start their icons a beat apart. */}
      <ServiceIcon id={service.id} code={service.code} color={color} delay={(order % 3) * 90} />
      <h3 className="mt-1 text-xl font-bold text-[#2b3278]">{service.name}</h3>
      <p className="flex-1 leading-relaxed text-[#5b6770]">{resolveText(service.summary, audience)}</p>
      {service.tag && (
        <span className="self-start rounded-full px-3 py-1 text-xs font-semibold" style={{ color, backgroundColor: `${color}14` }}>
          {service.tag}
        </span>
      )}
    </li>
  );
}

export function ServicesSection({ content, audience, index }: SectionProps & { index: number }) {
  const { services } = content;
  return (
    <LightSection index={index} motif="assembly">
      <Eyebrow index={index}>What we do</Eyebrow>
      <SectionHeading title={services.title} />
      <p className={`mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={delay(160)}>
        {resolveText(services.intro, audience)}
      </p>
      <ul className={`mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${PRESENT_GAP} ${PRESENT_COLUMNS.services}`}>
        {services.items.map((service, i) => (
          <ServiceCard key={service.id} service={service} audience={audience} order={i} />
        ))}
      </ul>
    </LightSection>
  );
}

const SPEC_COLORS = [BRAND.teal, "#6cc4e6", "#d7a6d7"];

/** Specs carry no id, so the icon is picked from the unit and label wording. */
function specIcon(spec: { unit: string; label: string }): LucideIcon | null {
  const words = `${spec.unit} ${spec.label}`.toLowerCase();
  if (/\b(cores?|cpus?|processing)\b/.test(words)) return Cpu;
  if (/\b(ram|memory)\b/.test(words)) return MemoryStick;
  if (/\b(storage|disk|tb|pb)\b/.test(words)) return HardDrive;
  return null;
}

export function InfrastructureSection({ content, audience, index }: SectionProps & { index: number }) {
  const { infrastructure } = content;
  return (
    <div className="relative overflow-hidden bg-[#1c2152] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(18,202,153,0.18),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(94,32,94,0.45),transparent_50%)]"
        aria-hidden="true"
      />
      <SectionBackdrop variant="infrastructure" />
      <div className={`relative mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24 ${PRESENT_WIDE}`}>
        <Eyebrow index={index} onDark>
          Under the hood
        </Eyebrow>
        <SectionHeading title={infrastructure.title} onDark />
        <p
          className={`${styles.enter} mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[#12ca99]/35 bg-[#12ca99]/10 px-5 py-3 text-white/90`}
          style={delay(160)}
        >
          <span className="font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#12ca99]">
            In simple terms
          </span>
          <span className="font-medium">{resolveText(infrastructure.analogy, audience)}</span>
        </p>
        {/* Present mode: the machines side by side, each with a smaller photo. */}
        <div
          className={`mt-10 space-y-6 ${PRESENT_GAP} group-data-[presenting]/tour:grid group-data-[presenting]/tour:grid-cols-[repeat(auto-fit,minmax(28rem,1fr))] group-data-[presenting]/tour:gap-6 group-data-[presenting]/tour:space-y-0!`}
        >
          {infrastructure.items.map((item, itemIndex) => {
            const src = tourAssetUrl(item.image);
            return (
              <article
                key={item.id}
                style={stagger(itemIndex)}
                className={`${styles.enter} flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-center md:gap-14 md:p-10 group-data-[presenting]/tour:md:gap-6! group-data-[presenting]/tour:md:p-6!`}
              >
                {src && (
                  <div className="flex h-80 shrink-0 items-center justify-center rounded-2xl bg-[radial-gradient(circle,#ffffff_0%,#dff3ee_100%)] p-6 md:h-[460px] md:w-[360px] group-data-[presenting]/tour:p-4! group-data-[presenting]/tour:md:h-[320px]! group-data-[presenting]/tour:md:w-[180px]!">
                    <img src={src} alt={`${item.name} photo`} loading="lazy" className="h-full w-auto object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  {item.kicker && (
                    <p className="font-quicksand text-xs font-bold uppercase tracking-[0.15em] text-[#12ca99]">
                      {item.kicker}
                    </p>
                  )}
                  <h3 className="mt-1 text-3xl font-black">{item.name}</h3>
                  <p className="mt-2 text-lg text-white/70">{resolveText(item.description, audience)}</p>
                  <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                    {item.specs.map((spec, i) => {
                      const color = SPEC_COLORS[i % SPEC_COLORS.length];
                      const Icon = specIcon(spec);
                      return (
                        <div
                          key={spec.label || i}
                          className="relative flex flex-col-reverse rounded-2xl border-l-4 bg-white/[0.06] px-6 py-5"
                          style={{ borderColor: color }}
                        >
                          {Icon && (
                            <Icon className="absolute right-4 top-4 h-5 w-5 opacity-70" style={{ color }} aria-hidden="true" />
                          )}
                          <dt className="mt-1 text-sm font-medium text-white/70">{spec.label}</dt>
                          <dd className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tight" style={{ color }}>
                              <CountUp value={spec.value} />
                            </span>
                            <span className="text-xl font-bold text-white/80">{spec.unit}</span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TrainingsSection({ content, audience, index }: SectionProps & { index: number }) {
  const { trainings } = content;
  return (
    <LightSection index={index} motif="network">
      <Eyebrow index={index}>Learn with us</Eyebrow>
      <SectionHeading title={trainings.title} />
      <p className={`mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={delay(160)}>
        {resolveText(trainings.intro, audience)}
      </p>
      <ul className={`mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6 ${PRESENT_GAP} ${PRESENT_COLUMNS.trainings}`}>
        {trainings.items.map((training, i) => {
          const src = tourAssetUrl(training.image);
          // 3 across on the first row, 2 wider tiles after (matches the deck).
          // Present mode puts them all in one row of squares instead.
          const span = `${i < 3 ? "lg:col-span-2" : "lg:col-span-3"} group-data-[presenting]/tour:col-span-1! group-data-[presenting]/tour:aspect-square!`;
          return (
            <li
              key={training.name}
              className={`${span} ${styles.enter} group relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#f0e8f2]`}
              style={stagger(i)}
            >
              {src && (
                <img
                  src={src}
                  alt={`${training.name} training session`}
                  loading="lazy"
                  className={`${styles.kenBurns} h-full w-full object-cover transition-transform duration-500 group-hover:scale-105`}
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(28,33,82,0.92),rgba(28,33,82,0))] px-5 pb-4 pt-16">
                <p className="text-lg font-bold text-white">{training.name}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </LightSection>
  );
}

export function ProjectsSection({ content, audience, index }: SectionProps & { index: number }) {
  const { projects } = content;
  const [lead, ...rest] = projects.items;
  if (!lead) return null;
  return (
    <LightSection index={index} motif="contours">
      <Eyebrow index={index}>Research highlights</Eyebrow>
      <SectionHeading title={projects.title} />
      <p className={`mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={delay(160)}>{resolveText(projects.intro, audience)}</p>

      <FeaturedProject project={lead} audience={audience} />

      {rest.length > 0 && (
        <ul className="mt-6 grid gap-5 md:grid-cols-2">
          {rest.map((project, i) => (
            <li key={project.id} className={`${CARD} ${styles.enter} p-6`} style={stagger(i, 320)}>
              {project.status && (
                <p className="font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a7558]">{project.status}</p>
              )}
              <h3 className="mt-2 text-xl font-black text-[#2b3278]">{project.title}</h3>
              {project.species && <p className="italic text-[#5e205e]">{project.species}</p>}
              <p className="mt-2 text-[#5b6770]">{resolveText(project.summary, audience)}</p>
            </li>
          ))}
        </ul>
      )}
    </LightSection>
  );
}

export function VariantTreeSection({
  content,
  audience,
  index,
  summary,
}: SectionProps & { index: number; summary: TourPhyloSummary }) {
  const nextstrain = content.nextstrain!;
  const provinces = summary.provinces.filter((p) => p.count > 0 && p.name !== "Other").length;
  return (
    <LightSection index={index} className="py-16">
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-3xl">
          <Eyebrow index={index}>Tracking the variants</Eyebrow>
          <SectionHeading title={nextstrain.title} />
          <p className={`mt-3 text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={delay(160)}>{resolveText(nextstrain.intro, audience)}</p>
        </div>
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[#2b3278] lg:mt-0 lg:shrink-0 lg:flex-col lg:text-right">
          <div className="flex items-baseline gap-1.5 lg:justify-end">
            <dd className="text-2xl font-black tabular-nums">
              <CountUp value={summary.tipCount.toLocaleString("en-PH")} />
            </dd>
            <dt className="text-sm font-semibold">genomes</dt>
          </div>
          <div className="flex items-baseline gap-1.5 lg:justify-end">
            <dt className="sr-only">Sampled</dt>
            <dd className="text-sm font-semibold">
              {formatMonth(summary.firstMonth)} – {formatMonth(summary.lastMonth)}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5 lg:justify-end">
            <dd className="text-sm font-semibold">{provinces}</dd>
            <dt className="text-sm font-semibold">provinces</dt>
          </div>
        </dl>
      </div>
      <PhyloTree summary={summary} />
      <p className="mt-3 text-xs text-[#5b6770]">
        Each dot is one sequenced virus; branches join viruses that share an ancestor. Built with Nextstrain; dates
        rounded to the month; no sample IDs or patient details are included.
      </p>
    </LightSection>
  );
}

/** Seconds each mutation stays up while the timeline plays. */
const VIRUS_STEP_MS = 7000;

const VIRUS_VIEWS: { id: VirusView; label: string }[] = [
  { id: "virus", label: "Whole virus" },
  { id: "spike", label: "Spike detail" },
];

export function VirusModelSection({
  content,
  audience,
  index,
  summary,
}: SectionProps & { index: number; summary: TourVirusSummary }) {
  const virusModel = content.virusModel!;
  const { mutations } = summary;
  const [view, setView] = useState<VirusView>("virus");
  const [siteIndex, setSiteIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rotating, setRotating] = useState(true);
  // False when the browser has no WebGL and a still picture is shown.
  const [interactive, setInteractive] = useState(true);
  const site = siteIndex === null ? null : (mutations[siteIndex] ?? null);

  const showView = (next: VirusView) => {
    setPlaying(false);
    setView(next);
    if (next === "virus") setSiteIndex(null);
  };
  const pick = (i: number) => {
    setPlaying(false);
    setView("spike");
    setSiteIndex(i === siteIndex ? null : i);
  };
  const openSpike = useCallback(() => {
    setPlaying(false);
    setView("spike");
  }, []);
  const togglePlay = () => {
    if (playing) return setPlaying(false);
    setView("spike");
    setSiteIndex((i) => (i === null || i >= mutations.length - 1 ? 0 : i));
    setPlaying(true);
  };

  // Steps through the mutations in date order, then starts over. A hidden tab holds the step.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSiteIndex((i) => (i === null || i + 1 >= mutations.length ? 0 : i + 1));
    }, VIRUS_STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, mutations.length]);

  const first = mutations[0]?.firstMonth;
  const last = mutations.at(-1)?.firstMonth;

  return (
    <div className="relative overflow-hidden bg-[#1c2152] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(18,202,153,0.16),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(94,32,94,0.5),transparent_55%)]"
        aria-hidden="true"
      />
      <div className={`relative mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-24 ${PRESENT_WIDE}`}>
        <Eyebrow index={index} onDark>
          Up close
        </Eyebrow>
        <SectionHeading title={virusModel.title} onDark />
        <p className={`mt-3 max-w-3xl text-lg leading-relaxed text-white/70 ${styles.enter}`} style={delay(160)}>
          {resolveText(virusModel.intro, audience)}
        </p>

        <div className={`mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] ${PRESENT_GAP}`}>
          <figure
            className={`${styles.enter} relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] bg-[radial-gradient(circle_at_50%_50%,rgba(42,119,151,0.35),transparent_65%)] md:h-[540px] group-data-[presenting]/tour:md:h-[480px]!`}
            style={delay(240)}
          >
            <VirusViewer
              view={view}
              site={site}
              mutations={mutations}
              spinning={rotating && !playing && !site}
              onOpenSpike={openSpike}
              onInteractiveChange={setInteractive}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
              <div
                role="radiogroup"
                aria-label="Choose the 3D view"
                className="pointer-events-auto flex rounded-full border border-white/15 bg-[#1c2152]/70 p-1 backdrop-blur"
              >
                {VIRUS_VIEWS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={view === option.id}
                    onClick={() => showView(option.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === option.id ? "bg-[#12ca99] text-[#1c2152]" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {interactive && (
                <button
                  type="button"
                  aria-pressed={rotating}
                  onClick={() => setRotating((on) => !on)}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1c2152]/70 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/10"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  {rotating ? "Stop turning" : "Turn"}
                </button>
              )}
            </div>

            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 md:p-5">
              <span
                className={`inline-flex items-center gap-2 rounded-full bg-[#1c2152]/70 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur ${site ? "max-sm:hidden" : ""}`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff8601]" aria-hidden="true" />
                {view === "virus" ? "Spike (S) protein · click the orange one to look closer" : "Mutation sites on the spike"}
              </span>
              {site && (
                <span
                  key={site.name}
                  role="status"
                  className="rounded-2xl border-l-4 border-[#ff8601] bg-[#1c2152]/85 px-4 py-2.5 backdrop-blur md:px-5 md:py-3"
                >
                  <span className="block font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#12ca99]">
                    Spike mutation
                  </span>
                  <span className="block text-2xl font-black tracking-tight md:text-3xl">{site.name}</span>
                  <span className="block text-sm text-white/75">
                    First seen {formatMonth(site.firstMonth)} · {site.count.toLocaleString("en-PH")} genomes
                  </span>
                  {!site.chains.length && (
                    <span className="mt-1 block text-xs text-white/60">Not resolved in this structure, so not marked.</span>
                  )}
                </span>
              )}
            </figcaption>
          </figure>

          <aside
            className={`${styles.enter} flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-7`}
            style={delay(320)}
          >
            <p className="font-quicksand text-xs font-bold uppercase tracking-[0.15em] text-[#12ca99]">Mutations across time</p>
            <h3 className="mt-1 text-2xl font-black">{mutations.length} spike changes we saw</h3>
            {first && last && (
              <p className="mt-1 text-sm text-white/65">
                First seen between {formatMonth(first)} and {formatMonth(last)}
              </p>
            )}
            <button
              type="button"
              aria-pressed={playing}
              onClick={togglePlay}
              className="mt-5 inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#2a7797] px-4 py-2 text-sm font-semibold text-white transition-shadow hover:bg-[#236681] hover:shadow-[0_0_20px_rgba(18,202,153,0.35)]"
            >
              {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {playing ? "Pause timeline" : "Play timeline"}
            </button>
            <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Spike mutations, earliest first">
              {mutations.map((m, i) => {
                const active = i === siteIndex;
                return (
                  <li key={m.name}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => pick(i)}
                      className={`w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${
                        active
                          ? "border-[#12ca99] bg-[#12ca99] text-[#1c2152]"
                          : "border-white/10 bg-white/[0.06] text-white hover:border-[#12ca99]/60"
                      }`}
                    >
                      <span className="block text-sm font-black tabular-nums">{m.name}</span>
                      <span className={`block text-[11px] font-medium ${active ? "text-[#1c2152]/75" : "text-white/60"}`}>
                        {formatMonth(m.firstMonth)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-sm leading-relaxed text-white/70" aria-live="polite">
              {site
                ? [site.description, site.region].filter(Boolean).join(" · ")
                : "Pick a change to see where it sits on the spike, the part of the virus that grabs our cells."}
            </p>
          </aside>
        </div>
        <p className="mt-4 text-xs text-white/55">
          The whole virus is a simplified drawing. The spike is a measured protein structure (PDB {summary.structure.id}
          {summary.structure.method ? `, ${summary.structure.method}` : ""}); orange dots mark where each change sits, not its
          new shape. Months are the earliest in our available records
          {summary.coverage ? ` (${summary.coverage})` : ""}; counts are sequenced genomes, not cases.
        </p>
      </div>
    </div>
  );
}

function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Round an axis maximum up to 1, 2, 2.5 or 5 × 10ⁿ so the ticks read cleanly. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

function QuarterlyChart({ quarterly }: { quarterly: TourCovidStats["quarterly"] }) {
  const [active, setActive] = useState<number | null>(null);
  const [ref, reveal] = useReveal<HTMLDivElement>();
  // Bars grow left to right over ~0.8s, then the peak label appears.
  const barStep = Math.min(60, 800 / Math.max(1, quarterly.length));
  const peak = Math.max(1, ...quarterly.map((q) => q.samples));
  const peakIndex = quarterly.findIndex((q) => q.samples === peak);
  const top = niceCeil(peak);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const dense = quarterly.length > 16;

  return (
    <div ref={ref} data-reveal={reveal} className="mt-8 flex gap-3">
      {/* y-axis */}
      <div className="relative h-64 w-10 shrink-0 text-right text-[11px] tabular-nums text-[#5b6770]" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(t / top) * 100}%` }}>
            {t.toLocaleString("en-PH")}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-64" onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <span
              key={t}
              className={`absolute inset-x-0 h-px ${t === 0 ? "bg-[#2b3278]/30" : "bg-[#2b3278]/[0.07]"}`}
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <ol className="absolute inset-0 flex items-end gap-0.5 md:gap-1.5">
            {quarterly.map((q, i) => {
              const isPeak = i === peakIndex;
              const isActive = active === i;
              const height = Math.max(q.samples > 0 ? 1.5 : 0, (q.samples / top) * 100);
              const align =
                i > quarterly.length * 0.7 ? "right-0" : i < quarterly.length * 0.3 ? "left-0" : "left-1/2 -translate-x-1/2";
              return (
                <li
                  key={q.label}
                  tabIndex={0}
                  aria-label={`${q.label}: ${q.samples.toLocaleString("en-PH")} samples`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#12ca99]"
                >
                  {isActive && <span className="absolute inset-0 rounded-md bg-[#2b3278]/[0.05]" aria-hidden="true" />}
                  <span
                    className={`${styles.bar} relative w-full max-w-12 rounded-t-[4px] transition-[filter] duration-150`}
                    style={{
                      ...delay(Math.round(i * barStep)),
                      height: `${height}%`,
                      background: isPeak
                        ? `linear-gradient(to top, ${BRAND.purple}, #8a3a8a)`
                        : `linear-gradient(to top, ${BRAND.deepTeal}, #1f9e8a)`,
                      filter: isActive ? "brightness(1.15)" : undefined,
                    }}
                    aria-hidden="true"
                  >
                    {isPeak && !isActive && (
                      <span
                        className={`${styles.fadeIn} absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#5e205e] px-2 py-0.5 text-[11px] font-bold text-white`}
                        style={delay(Math.round(quarterly.length * barStep) + 500)}
                      >
                        Peak · {q.samples.toLocaleString("en-PH")}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <span
                      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-[#1c2152] px-3 py-2 text-left text-xs text-white shadow-lg ${align}`}
                      style={{ bottom: `calc(${height}% + 10px)` }}
                      aria-hidden="true"
                    >
                      <span className="block font-semibold text-white/70">{q.label}</span>
                      <span className="block text-base font-black tabular-nums">
                        {q.samples.toLocaleString("en-PH")}
                        <span className="ml-1 text-xs font-medium text-white/70">samples</span>
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* x-axis: quarter, with the year under the first quarter shown for that year */}
        <ol className="mt-2 flex gap-0.5 md:gap-1.5" aria-hidden="true">
          {quarterly.map((q, i) => {
            const [quarter, year] = q.label.split(" ");
            const firstOfYear = i === 0 || quarterly[i - 1]?.label.split(" ")[1] !== year;
            return (
              <li key={q.label} className="min-w-0 flex-1 text-center">
                <span className={`block text-[10px] font-semibold text-[#5b6770] md:text-[11px] ${dense ? "max-md:invisible" : ""}`}>
                  {quarter}
                </span>
                <span className={`block h-4 whitespace-nowrap text-[11px] font-bold text-[#2b3278] ${firstOfYear ? "" : "invisible"}`}>
                  {year}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function CovidSection({
  content,
  audience,
  index,
  stats,
}: SectionProps & { index: number; stats: TourCovidStats | null }) {
  const { covid } = content;
  const from = formatMonthYear(stats?.firstRunDate ?? null);
  const to = formatMonthYear(stats?.lastRunDate ?? null);
  const tiles = stats
    ? [
        { value: stats.totalSamples.toLocaleString("en-PH"), label: "samples sequenced", color: BRAND.deepTeal },
        { value: stats.totalRuns.toLocaleString("en-PH"), label: "sequencing runs", color: BRAND.purple },
        { value: stats.lineageAssigned.toLocaleString("en-PH"), label: "genomes assigned a lineage", color: BRAND.teal },
        ...(stats.pctLineageAssigned !== null
          ? [{ value: `${stats.pctLineageAssigned.toFixed(1)}%`, label: "lineage assignment rate", color: BRAND.navy }]
          : []),
      ]
    : [];

  return (
    <LightSection index={index} motif="radar" lavender>
        <Eyebrow index={index}>Public health impact</Eyebrow>
        <SectionHeading title={covid.title} />
        <p className={`mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={delay(160)}>
          {resolveText(covid.intro, audience)}
        </p>
        {stats && (
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)]">
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              {tiles.map((tile, i) => (
                <div
                  key={tile.label}
                  className={`${CARD} ${styles.enter} relative flex flex-col-reverse justify-end overflow-hidden py-4 pl-6 pr-5`}
                  style={stagger(i)}
                >
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: tile.color }} aria-hidden="true" />
                  <dt className="mt-0.5 text-sm font-medium text-[#5b6770]">{tile.label}</dt>
                  <dd className="text-3xl font-black tracking-tight text-[#2b3278] tabular-nums">
                    <CountUp value={tile.value} />
                  </dd>
                </div>
              ))}
            </dl>
            {stats.quarterly.length > 0 && (
              <figure className={`${CARD} ${styles.enter} flex flex-col p-6 md:p-8`} style={delay(260)}>
                <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-lg font-bold text-[#2b3278]">Samples sequenced per quarter</span>
                  {from && to && (
                    <span className="text-sm font-medium text-[#5b6770]">
                      {from} – {to}
                    </span>
                  )}
                </figcaption>
                <div className="flex flex-1 flex-col justify-end">
                  <QuarterlyChart quarterly={stats.quarterly} />
                </div>
              </figure>
            )}
          </div>
        )}
    </LightSection>
  );
}

export function TeamSection({ content, audience, index }: SectionProps & { index: number }) {
  const { team } = content;
  return (
    <LightSection index={index} motif="bokeh">
      <Eyebrow index={index}>The people</Eyebrow>
      <SectionHeading title={team.title} />
      <p className={`mt-3 max-w-3xl text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={delay(160)}>{resolveText(team.intro, audience)}</p>
      <ul className={`mt-10 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4 ${PRESENT_GAP} ${PRESENT_COLUMNS.team}`}>
        {team.members.map((member, i) => {
          const src = tourAssetUrl(member.image);
          return (
            <li key={member.id} className={`${CARD} ${styles.enter} group flex flex-col overflow-hidden`} style={stagger(i)}>
              <div className="aspect-[310/366] overflow-hidden bg-[#f0e8f2]">
                {src && (
                  <img
                    src={src}
                    alt={member.fullName}
                    loading="lazy"
                    className={`${styles.kenBurns} h-full w-full object-cover transition-transform duration-500 group-hover:scale-105`}
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 border-t-4 border-[#12ca99] px-4 py-4">
                <p className="text-lg font-black text-[#2b3278] md:text-xl">{member.nickname}</p>
                <p className="text-xs font-medium text-[#333333] md:text-[13px]">{member.fullName}</p>
                <p className="mt-1 font-quicksand text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a7558] md:text-[11px]">
                  {member.position}
                </p>
              </div>
            </li>
          );
        })}
        {team.joinCard && (
          <li
            className={`${styles.enter} flex flex-col justify-center gap-2 rounded-2xl bg-[linear-gradient(150deg,#2b3278,#5e205e)] p-6 text-white`}
            style={stagger(team.members.length)}
          >
            <span className="mb-2 h-1 w-10 rounded-full bg-[#12ca99]" aria-hidden="true" />
            <p className="text-xl font-black md:text-2xl">{team.joinCard.title}</p>
            <p className="text-sm leading-relaxed text-white/85 md:text-base">{team.joinCard.body}</p>
          </li>
        )}
      </ul>
    </LightSection>
  );
}

export function VideosSection({ content, index }: SectionProps & { index: number }) {
  const { videos } = content;
  return (
    <LightSection index={index}>
      <Eyebrow index={index}>See it in action</Eyebrow>
      <SectionHeading title={videos.title} />
      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {videos.items.map((video, i) => (
          <li key={video.id} className={`${CARD} ${styles.enter} overflow-hidden`} style={stagger(i)}>
            <div className="aspect-video bg-[#1c2152]">
              {video.youtubeId ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                video.url && <video className="h-full w-full" src={video.url} controls preload="none" />
              )}
            </div>
            <p className="flex items-baseline justify-between gap-3 px-5 py-4">
              <span className="font-semibold text-[#2b3278]">{video.title}</span>
              {video.duration && <span className="text-sm text-[#5b6770]">{video.duration}</span>}
            </p>
          </li>
        ))}
      </ul>
    </LightSection>
  );
}

/** The contact slide bookends the hero: its helix draws in when scrolled to. */
function ContactHelix() {
  const [ref, reveal] = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-reveal={reveal}
      className="pointer-events-none absolute -bottom-6 -right-24 hidden w-[600px] opacity-45 lg:block"
      aria-hidden="true"
    >
      <LogoHelix onDark animate className="w-full" />
    </div>
  );
}

export function ContactSection({ content, audience, index }: SectionProps & { index: number }) {
  const { contact } = content;
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(120deg,#2b3278_0%,#5e205e_55%,#2a7797_100%)] text-white">
      <SectionBackdrop variant="contact" />
      <ContactHelix />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="flex items-center gap-3 font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0d8]">
            <span className="h-0.5 w-8 rounded-full bg-[#12ca99]" aria-hidden="true" />
            {String(index).padStart(2, "0")} · Work with us
          </p>
          <h2
            className={`${styles.enter} mt-3 max-w-3xl text-3xl font-black tracking-tight md:text-[40px] md:leading-[1.15]`}
            style={delay(80)}
          >
            {contact.title}
          </h2>
          <p className="mt-3 text-lg text-white/85">{resolveText(contact.intro, audience)}</p>
          {contact.social && (
            <div className="mt-6">
              <p className="text-sm font-medium text-white/80">
                Follow us: <span className="font-bold text-white">{contact.social.handle}</span>
              </p>
              {contact.social.platforms.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2.5" aria-label="Find us on">
                  {contact.social.platforms.map((platform) => (
                    <li
                      key={platform}
                      title={platform}
                      className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/[0.1] px-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.2),0_6px_14px_-6px_rgba(10,12,40,0.6)]"
                    >
                      {hasSocialIcon(platform) ? (
                        <>
                          <SocialIcon platform={platform} className="h-[18px] w-[18px]" />
                          <span className="sr-only">{platform}</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold">{platform}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <ul className="space-y-3">
          {contact.emails.map((email, i) => (
            <li key={email.address} className={styles.enter} style={stagger(i, 250)}>
              <a
                href={`mailto:${email.address}`}
                className="block rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 transition-colors hover:border-[#12ca99]/60 hover:bg-white/[0.14]"
              >
                <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[#9ff0d8]">{email.label}</span>
                <span className="mt-0.5 block break-all font-semibold">{email.address}</span>
              </a>
            </li>
          ))}
        </ul>
        {contact.qrCodes.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:col-span-2">
            {contact.qrCodes.map((qr, i) => (
              <li key={qr.url} className={styles.enter} style={stagger(i, 400)}>
                <EmbossedQr label={qr.label} url={qr.url} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * A QR code pressed into a raised plate: the plate catches light on its top
 * edge and casts a shadow below, and the code sits in a sunken well.
 */
function EmbossedQr({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/qr flex flex-col items-center text-center"
    >
      <span className="block w-full max-w-[200px] rounded-[22px] bg-[linear-gradient(145deg,#ffffff_0%,#e9e7f1_100%)] p-3.5 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(43,50,120,0.12),0_2px_0_rgba(20,22,60,0.35),0_14px_28px_-10px_rgba(10,12,40,0.6),-6px_-6px_18px_-8px_rgba(255,255,255,0.18)] transition-transform duration-300 group-hover/qr:-translate-y-1">
        <span className="block rounded-[14px] bg-white p-2 shadow-[inset_2px_3px_6px_rgba(43,50,120,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]">
          <DoiQr url={url} label={`QR code for the PGC Visayas ${label}`} className="block h-auto w-full rounded-md" />
        </span>
      </span>
      <span className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-white/65">PGC Visayas</span>
      <span className="mt-0.5 font-quicksand text-lg font-bold leading-tight text-white [text-shadow:0_1px_0_rgba(0,0,0,0.35),0_-1px_0_rgba(255,255,255,0.12)]">
        {label}
      </span>
    </a>
  );
}
