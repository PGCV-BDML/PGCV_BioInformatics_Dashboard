/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import type { CSSProperties } from "react";
import {
  CircleDot,
  Dna,
  ExternalLink,
  FileText,
  HeartHandshake,
  ListChecks,
  Puzzle,
  TestTube,
  type LucideIcon,
} from "lucide-react";
import { resolveText, tourAssetUrl, type Audience, type TourProject, type TourProjectStep } from "@/lib/tour";
import { BRAND, CARD } from "./brand";
import { CountUp } from "./count-up";
import { DoiQr } from "./doi-qr";
import styles from "./tour-motion.module.css";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const HIGHLIGHT_COLORS = [BRAND.teal, BRAND.deepTeal, BRAND.purple, BRAND.navy];

/** Steps carry no icon, so one is picked from the wording. */
function stepIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (/sampl|collect|tissue/.test(l)) return TestTube;
  if (/sequenc/.test(l)) return Dna;
  if (/assembl/.test(l)) return Puzzle;
  if (/annotat/.test(l)) return ListChecks;
  if (/publish|paper/.test(l)) return FileText;
  if (/conserv|divers/.test(l)) return HeartHandshake;
  return CircleDot;
}

/**
 * The photo half: Red List badge, extra facts and the species' range on top
 * (the subject's face usually sits lower in the frame), caption and credit
 * along the bottom. Shown on navy when there is no photo.
 */
function ProjectPhoto({ project }: { project: TourProject }) {
  const src = tourAssetUrl(project.image);
  const name = project.commonName ?? project.species ?? project.title;
  const range = project.range;
  return (
    <div className="relative min-h-[380px] shrink-0 overflow-hidden bg-[#1c2152] lg:min-h-[540px] lg:w-[44%]">
      {src && (
        <img
          src={src}
          alt={project.imageTitle ? `${project.imageTitle}: ${name}` : name}
          loading="lazy"
          className={`${styles.kenBurns} absolute inset-0 h-full w-full object-cover`}
          style={project.imageFocus ? { objectPosition: project.imageFocus, transformOrigin: project.imageFocus } : undefined}
        />
      )}
      <div
        className="absolute inset-x-0 top-0 h-[48%] bg-[linear-gradient(to_bottom,rgba(28,33,82,0.9),rgba(28,33,82,0))]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-4 p-5 text-white md:p-6">
        {(project.conservation || project.facts.length > 0) && (
          <ul className="flex flex-wrap gap-2 text-xs font-bold">
            {project.conservation && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecea] py-1 pl-1.5 pr-3 text-[#a1261d]">
                <span className="rounded bg-[#c8281e] px-1.5 py-0.5 text-[10px] tracking-wide text-white">
                  {project.conservation.code}
                </span>
                {project.conservation.label}
              </li>
            )}
            {project.facts.map((fact) => (
              <li key={fact} className="rounded-full bg-white/90 px-3 py-1 text-[#2b3278]">
                {fact}
              </li>
            ))}
          </ul>
        )}
        {range && (range.current.length > 0 || range.former.length > 0) && (
          <div>
            <p className="font-quicksand text-[11px] font-bold uppercase tracking-[0.14em] text-[#9ff0d8]">{range.title}</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {range.current.map((place) => (
                <li key={place} className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 font-bold">
                  {place}
                </li>
              ))}
              {range.former.map((place) => (
                <li key={place} className="rounded-lg border border-white/20 px-3 py-1 text-white/60 line-through">
                  <span className="sr-only">Formerly </span>
                  {place}
                </li>
              ))}
            </ul>
            {range.former.length > 0 && (
              <p className="mt-2 text-[11px] text-white/65">Struck through: islands where it no longer survives in the wild</p>
            )}
          </div>
        )}
      </div>
      {(project.imageTitle || project.imageCredit) && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-[linear-gradient(to_top,rgba(28,33,82,0.8),rgba(28,33,82,0))] px-5 pb-4 pt-12 text-white md:px-6">
          {project.imageTitle && <p className="text-base font-black">{project.imageTitle}</p>}
          {project.imageCredit && <p className="text-[11px] text-white/75">{project.imageCredit}</p>}
        </div>
      )}
    </div>
  );
}

function StepTimeline({ steps }: { steps: TourProjectStep[] }) {
  // The teal line runs from the first step to the last one that is done or underway.
  const reached = steps.reduce((last, step, i) => (step.state === "next" ? last : i), 0);
  const fill = steps.length > 1 ? reached / (steps.length - 1) : 0;
  const inset = `${50 / steps.length}%`;
  return (
    <div className="relative mt-3">
      <div className="absolute top-5 hidden h-[3px] rounded-full bg-[#2b3278]/10 sm:block" style={{ left: inset, right: inset }} aria-hidden="true">
        <div
          className={`${styles.growX} h-full rounded-full bg-[#12ca99]`}
          style={{ width: `${fill * 100}%`, ...delay(400) }}
        />
      </div>
      <ol
        className="relative grid gap-3 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))] sm:gap-1"
        style={{ "--steps": steps.length } as CSSProperties}
      >
        {steps.map((step, i) => {
          const Icon = stepIcon(step.label);
          return (
            <li
              key={step.label}
              className={`${styles.enter} flex items-center gap-3 sm:flex-col sm:gap-1.5 sm:text-center`}
              style={delay(400 + i * 110)}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 ${
                  step.state === "done"
                    ? "border-[#12ca99] bg-[#12ca99] text-white"
                    : step.state === "now"
                      ? "border-[#12ca99] bg-white text-[#0a7558] shadow-[0_0_0_5px_rgba(18,202,153,0.18)]"
                      : "border-[#2b3278]/15 bg-white text-[#2b3278]"
                }`}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs leading-snug text-[#5b6770]">
                <span className="block text-[13px] font-bold text-[#2b3278]">{step.label}</span>
                {step.note}
                <span className="sr-only">
                  {step.state === "done" ? " (done)" : step.state === "now" ? " (in progress)" : " (coming next)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The first project, shown large: photo, story, numbers, timeline and citation. */
export function FeaturedProject({ project, audience }: { project: TourProject; audience: Audience }) {
  const hasPhotoPanel =
    Boolean(tourAssetUrl(project.image)) || Boolean(project.conservation) || Boolean(project.range) || project.facts.length > 0;
  return (
    <article className={`${CARD} ${styles.enter} relative mt-10 flex flex-col overflow-hidden lg:flex-row`} style={delay(220)}>
      <span
        className="absolute inset-x-0 top-0 z-10 h-1 bg-[linear-gradient(90deg,#ff8601,#e5332a,#9c1f7a,#0176c3)]"
        aria-hidden="true"
      />
      {hasPhotoPanel && <ProjectPhoto project={project} />}

      <div className="flex flex-1 flex-col p-6 md:p-10">
        {project.status && (
          <span className="self-start rounded-full bg-[#12ca99]/15 px-3 py-1 font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a7558]">
            {project.status}
          </span>
        )}
        <h3 className="mt-4 text-2xl font-black text-[#2b3278] md:text-3xl">{project.title}</h3>
        {project.species && (
          <p className="mt-1 text-lg italic text-[#5e205e]">
            {project.species}
            {project.commonName && <span className="not-italic text-[15px] text-[#5b6770]"> · {project.commonName}</span>}
          </p>
        )}
        <p className="mt-4 text-lg leading-relaxed text-[#5b6770]">{resolveText(project.summary, audience)}</p>

        {project.highlights.length > 0 && (
          <dl className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {project.highlights.map((h, i) => (
              <div
                key={h.label || i}
                className="flex flex-col-reverse justify-end border-l-4 bg-[#f7f6fa] px-4 py-3"
                style={{ borderColor: HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length] }}
              >
                <dt className="mt-0.5 text-xs font-medium text-[#5b6770]">{h.label}</dt>
                <dd className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tracking-tight text-[#2b3278] tabular-nums">
                    <CountUp value={h.value} />
                  </span>
                  {h.unit && <span className="text-sm font-bold text-[#5b6770]">{h.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {project.steps.length > 0 && (
          <div className="mt-8">
            <p className="font-quicksand text-[11px] font-bold uppercase tracking-[0.14em] text-[#5b6770]">From sample to genome</p>
            <StepTimeline steps={project.steps} />
            {project.next && (
              <p className="mt-4 text-sm text-[#5b6770]">
                <span className="font-bold text-[#0a7558]">What&rsquo;s next: </span>
                {resolveText(project.next, audience)}
              </p>
            )}
          </div>
        )}

        {(project.partners.length > 0 || project.citation) && (
          <div className="mt-auto pt-7">
            {project.partners.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#2b3278]/10 pt-5">
                <span className="mr-1 font-quicksand text-[11px] font-bold uppercase tracking-[0.14em] text-[#5b6770]">
                  In partnership with
                </span>
                {project.partners.map((partner) => (
                  <span key={partner} className="rounded-lg bg-[#f7f6fa] px-3 py-1.5 text-sm font-bold text-[#2b3278]">
                    {partner}
                  </span>
                ))}
              </div>
            )}
            {project.citation && (
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#f7f6fa] p-3">
                <DoiQr
                  url={project.citation.url}
                  label={`QR code linking to ${project.citation.text}`}
                  className="h-16 w-16 shrink-0 rounded-md"
                />
                <p className="min-w-0 text-[13px] leading-relaxed text-[#5b6770]">
                  <a
                    href={project.citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#2b3278] underline-offset-2 hover:underline"
                  >
                    {project.citation.text}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <span className="block break-all">{project.citation.url.replace(/^https?:\/\//, "")}</span>
                  {project.citation.note && <span className="block">{project.citation.note}</span>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
