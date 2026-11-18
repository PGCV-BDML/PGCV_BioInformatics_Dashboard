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
import { tourAssetUrl, type Audience, type TourProject, type TourProjectStep } from "@/lib/tour";
import { BRAND, CARD } from "./brand";
import { CountUp } from "./count-up";
import { DoiQr } from "./doi-qr";
import { TourCopy } from "./tour-copy";
import styles from "./tour-motion.module.css";

/*
 * A project fills two slides: its story (photo, summary and numbers) and its
 * journey (from sample to genome, where the species lives, who it was done
 * with, what's next and the paper). On a phone they stack as the slides do.
 */

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

/** Whether the project has a second slide: its steps, range, partners, next steps or paper. */
export function hasProjectJourney(project: TourProject): boolean {
  return (
    project.steps.length > 0 ||
    Boolean(project.citation) ||
    Boolean(project.next) ||
    project.partners.length > 0 ||
    Boolean(project.range && (project.range.current.length || project.range.former.length))
  );
}

/** The photo: Red List badge and facts on top, the photo's title along the bottom. Navy when there is no photo. */
function ProjectPhoto({ project }: { project: TourProject }) {
  const src = tourAssetUrl(project.image);
  const name = project.commonName ?? project.species ?? project.title;
  return (
    <div className="relative min-h-[380px] shrink-0 overflow-hidden rounded-2xl bg-[#1c2152] canvas:h-full canvas:min-h-0">
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
        className="absolute inset-x-0 top-0 h-[40%] bg-[linear-gradient(to_bottom,rgba(28,33,82,0.85),rgba(28,33,82,0))]"
        aria-hidden="true"
      />
      {(project.conservation || project.facts.length > 0) && (
        <ul className="relative flex flex-wrap gap-2 p-5 text-xs font-bold canvas:p-4 canvas:text-[14px]">
          {project.conservation && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecea] py-1 pl-1.5 pr-3 text-[#a1261d]">
              <span className="rounded bg-[#c8281e] px-1.5 py-0.5 text-[10px] tracking-wide text-white canvas:text-[14px]">
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
      {project.imageTitle && (
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(28,33,82,0.8),rgba(28,33,82,0))] px-5 pb-4 pt-12 text-white">
          <p className="text-base font-black canvas:text-[22px]">{project.imageTitle}</p>
        </div>
      )}
    </div>
  );
}

/** The first slide: the photo beside the story and the numbers (the deck's `projects`). */
export function ProjectStory({ project, audience }: { project: TourProject; audience: Audience }) {
  // Visual: photo, title and big numbers; no story.
  const visual = audience === "visual";
  const hasPhoto =
    Boolean(tourAssetUrl(project.image)) || Boolean(project.conservation) || project.facts.length > 0 || Boolean(project.imageTitle);
  return (
    <article
      className={`${styles.enter} flex flex-col gap-6 canvas:grid canvas:h-full canvas:gap-7 ${hasPhoto ? "canvas:grid-cols-[410px_minmax(0,1fr)]" : ""}`}
      style={delay(220)}
    >
      {hasPhoto && <ProjectPhoto project={project} />}
      <div className="min-w-0">
        {project.status && (
          <span className="inline-block rounded-full bg-[#12ca99]/15 px-3 py-1 font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a7558] canvas:text-[14px]">
            {project.status}
          </span>
        )}
        <h3 className="mt-4 text-2xl font-black leading-tight text-[#2b3278] canvas:mt-2.5 canvas:text-[30px] canvas:leading-[1.15]">
          {project.title}
        </h3>
        {project.species && (
          <p className="mt-1 text-lg italic text-[#5e205e] canvas:text-[20px]">
            {project.species}
            {project.commonName && <span className="not-italic text-[15px] text-[#5b6770] canvas:text-[18px]"> · {project.commonName}</span>}
          </p>
        )}
        {!visual && (
          <p className="mt-4 text-lg leading-relaxed text-[#5b6770] canvas:mt-3 canvas:text-[18px] canvas:leading-normal">
            <TourCopy text={project.summary} audience={audience} />
          </p>
        )}
        {project.highlights.length > 0 && (
          <dl className={`mt-7 grid grid-cols-2 gap-3 canvas:mt-5 canvas:gap-2.5 ${visual ? "" : "canvas:grid-cols-4"}`}>
            {project.highlights.map((h, i) => (
              <div
                key={h.label || i}
                className="flex flex-col-reverse justify-end rounded-r-xl border-l-4 bg-white px-4 py-3 canvas:px-3.5 canvas:py-2.5"
                style={{ borderColor: HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length] }}
              >
                <dt className="mt-0.5 text-xs font-medium leading-snug text-[#5b6770] canvas:text-[14px]">{h.label}</dt>
                <dd className="flex items-baseline gap-1">
                  <span
                    className={`font-black tracking-tight text-[#2b3278] tabular-nums ${visual ? "text-4xl canvas:text-[48px]" : "text-2xl canvas:text-[30px]"}`}
                  >
                    <CountUp value={h.value} />
                  </span>
                  {h.unit && <span className="text-sm font-bold text-[#5b6770] canvas:text-[18px]">{h.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

/** The steps as cards in one row on the canvas, a list on a phone. `brief` leaves out each step's note. */
function StepTimeline({ steps, brief = false }: { steps: TourProjectStep[]; brief?: boolean }) {
  return (
    <ol
      className="grid gap-3 canvas:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
      style={{ "--steps": steps.length } as CSSProperties}
    >
      {steps.map((step, i) => {
        const Icon = stepIcon(step.label);
        return (
          <li
            key={step.label}
            className={`${CARD} ${styles.enter} relative flex items-center gap-3 px-4 py-3 canvas:flex-col canvas:items-start canvas:gap-2.5 canvas:px-4 canvas:py-4`}
            style={delay(300 + i * 110)}
          >
            {/* The line on to the next step. */}
            {i < steps.length - 1 && (
              <span className="absolute -right-3 top-9 hidden h-[3px] w-3 bg-[#12ca99] canvas:block" aria-hidden="true" />
            )}
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
            <span className="text-sm leading-snug text-[#5b6770] canvas:text-[18px]">
              <span className="block font-bold text-[#2b3278] canvas:text-[20px]">{step.label}</span>
              {!brief && step.note}
              <span className="sr-only">
                {step.state === "done" ? " (done)" : step.state === "now" ? " (in progress)" : " (coming next)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const KICKER = "font-quicksand text-[11px] font-bold uppercase tracking-[0.14em] canvas:text-[14px]";

/** The second slide: the steps along the top; the range and partners, what's next and the paper under them. */
export function ProjectJourney({ project, audience }: { project: TourProject; audience: Audience }) {
  // Visual: the steps' labels, where it lives and the paper's QR code; no notes, plans or partners.
  const visual = audience === "visual";
  const range = project.range && (project.range.current.length > 0 || project.range.former.length > 0) ? project.range : null;
  const partners = visual ? [] : project.partners;
  return (
    <div className="flex flex-col gap-6 canvas:gap-4">
      {project.steps.length > 0 && <StepTimeline steps={project.steps} brief={visual} />}
      <div className="grid gap-4 canvas:auto-cols-fr canvas:grid-flow-col canvas:gap-4">
        {(range || partners.length > 0) && (
          <div className={`${CARD} ${styles.enter} px-5 py-4`} style={delay(700)}>
            {range && (
              <>
                <p className={`${KICKER} text-[#0a7558]`}>{range.title}</p>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm canvas:text-[16px]">
                  {range.current.map((place) => (
                    <li key={place} className="rounded-lg bg-[#12ca99]/15 px-3 py-1 font-bold text-[#0a7558]">
                      {place}
                    </li>
                  ))}
                  {range.former.map((place) => (
                    <li key={place} className="rounded-lg bg-[#f7f6fa] px-3 py-1 text-[#5b6770] line-through">
                      <span className="sr-only">Formerly </span>
                      {place}
                    </li>
                  ))}
                </ul>
                {range.former.length > 0 && (
                  <p className="mt-2 text-[11px] text-[#5b6770] canvas:text-[14px]">Struck through: islands where it no longer survives in the wild</p>
                )}
              </>
            )}
            {partners.length > 0 && (
              <div className={range ? "mt-4" : ""}>
                <p className={`${KICKER} text-[#5b6770]`}>In partnership with</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {partners.map((partner) => (
                    <li key={partner} className="rounded-lg bg-[#f7f6fa] px-3 py-1.5 text-sm font-bold text-[#2b3278] canvas:text-[16px]">
                      {partner}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {project.next && !visual && (
          <div className={`${CARD} ${styles.enter} px-5 py-4`} style={delay(780)}>
            <p className={`${KICKER} text-[#0a7558]`}>What&rsquo;s next</p>
            <p className="mt-2 text-sm leading-relaxed text-[#5b6770] canvas:text-[18px] canvas:leading-normal">
              <TourCopy text={project.next} audience={audience} />
            </p>
          </div>
        )}
        {project.citation && (
          <div className={`${CARD} ${styles.enter} flex items-center gap-4 px-5 py-4`} style={delay(860)}>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#5b6770] canvas:text-[14px]">
              <a
                href={project.citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#2b3278] underline-offset-2 hover:underline canvas:text-[18px]"
              >
                {project.citation.text}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <span className="block break-all">{project.citation.url.replace(/^https?:\/\//, "")}</span>
              {!visual && project.citation.note && <span className="mt-1 block">{project.citation.note}</span>}
            </p>
            <DoiQr
              url={project.citation.url}
              label={`QR code linking to ${project.citation.text}`}
              className="h-20 w-20 shrink-0 rounded-md canvas:h-24 canvas:w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
}
