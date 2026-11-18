/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
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
import { tourAssetUrl, type Audience, type TourProject } from "@/lib/tour";
import { BRAND } from "./brand";
import { CountUp } from "./count-up";
import { DoiQr } from "./doi-qr";
import { TourCopy } from "./tour-copy";
import styles from "./tour-motion.module.css";

/*
 * A project on one slide, in three columns: the photo (with where the species
 * lives along its foot), the story and its numbers, and the journey from
 * sample to genome, ending in what's next and who it was done with. The
 * paper's QR code sits beside the slide's title (ProjectPaper). On a phone the
 * columns stack.
 *
 * It is a lot for one slide, so the text is smaller than on other slides; the
 * small print is at the decks' 14px floor, and there is no room to go lower.
 */

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const HIGHLIGHT_COLORS = [BRAND.teal, BRAND.deepTeal, BRAND.purple, BRAND.navy];
const KICKER = "font-quicksand text-[11px] font-bold uppercase tracking-[0.14em] canvas:text-[14px]";

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

function hasRange(project: TourProject): boolean {
  return Boolean(project.range && (project.range.current.length > 0 || project.range.former.length > 0));
}

/** Whether the project has a photo column: the photo, or anything drawn over it. */
function hasPhoto(project: TourProject): boolean {
  return (
    Boolean(tourAssetUrl(project.image)) ||
    Boolean(project.conservation) ||
    project.facts.length > 0 ||
    Boolean(project.imageTitle) ||
    hasRange(project)
  );
}

/** Whether the project has a journey column: its steps, what's next or its partners (not for Visual). */
function hasJourney(project: TourProject, visual: boolean): boolean {
  return project.steps.length > 0 || (!visual && (Boolean(project.next) || project.partners.length > 0));
}

/**
 * The photo: the Red List badge and facts on top; the photo's title and the
 * islands where the species lives (struck through where it is gone) along the
 * bottom. Navy when there is no photo.
 */
function ProjectPhoto({ project }: { project: TourProject }) {
  const src = tourAssetUrl(project.image);
  const name = project.commonName ?? project.species ?? project.title;
  const range = hasRange(project) ? project.range : null;
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
        <ul className="relative flex flex-wrap gap-2 p-4 text-xs font-bold canvas:p-3.5 canvas:text-[14px]">
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
      {(project.imageTitle || range) && (
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(28,33,82,0.92)_45%,rgba(28,33,82,0))] px-5 pb-4 pt-14 text-white canvas:px-4 canvas:pb-3.5">
          {project.imageTitle && <p className="text-base font-black canvas:text-[20px] canvas:leading-tight">{project.imageTitle}</p>}
          {range && (
            <>
              <p className={`${KICKER} text-[#7ee8c9] ${project.imageTitle ? "mt-2" : ""}`}>{range.title}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5 text-sm canvas:text-[14px]">
                {range.current.map((place) => (
                  <li key={place} className="rounded-md bg-[#12ca99] px-2 py-0.5 font-bold text-[#0b2b2e]">
                    {place}
                  </li>
                ))}
                {range.former.map((place) => (
                  <li key={place} className="rounded-md bg-white/15 px-2 py-0.5 text-white/75 line-through">
                    <span className="sr-only">Formerly </span>
                    {place}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The middle column: status, title, species, the story and the four numbers. */
function ProjectStory({ project, audience }: { project: TourProject; audience: Audience }) {
  // Visual: title and big numbers; no story.
  const visual = audience === "visual";
  return (
    <div className="min-w-0">
      {project.status && (
        <span className="inline-block rounded-full bg-[#12ca99]/15 px-3 py-1 font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a7558] canvas:text-[14px]">
          {project.status}
        </span>
      )}
      <h3 className="mt-4 text-2xl font-black leading-tight text-[#2b3278] canvas:mt-2 canvas:text-[26px] canvas:leading-[1.15]">
        {project.title}
      </h3>
      {project.species && (
        <p className="mt-1 text-lg italic text-[#5e205e] canvas:mt-0.5 canvas:text-[18px]">
          {project.species}
          {project.commonName && <span className="not-italic text-[15px] text-[#5b6770] canvas:text-[16px]"> · {project.commonName}</span>}
        </p>
      )}
      {!visual && (
        <p className="mt-4 text-lg leading-relaxed text-[#5b6770] canvas:mt-2 canvas:text-[16px] canvas:leading-[1.45]">
          <TourCopy text={project.summary} audience={audience} />
        </p>
      )}
      {project.highlights.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-3 canvas:mt-3 canvas:gap-2">
          {project.highlights.map((h, i) => (
            <div
              key={h.label || i}
              className="flex flex-col-reverse justify-end rounded-r-xl border-l-4 bg-white px-4 py-3 canvas:px-3 canvas:py-2"
              style={{ borderColor: HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length] }}
            >
              <dt className="mt-0.5 text-xs font-medium leading-snug text-[#5b6770] canvas:mt-0 canvas:text-[14px]">{h.label}</dt>
              <dd className="flex items-baseline gap-1">
                <span
                  className={`font-black tracking-tight text-[#2b3278] tabular-nums ${visual ? "text-4xl canvas:text-[40px]" : "text-2xl canvas:text-[24px]"}`}
                >
                  <CountUp value={h.value} />
                </span>
                {h.unit && <span className="text-sm font-bold text-[#5b6770] canvas:text-[15px]">{h.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** One stop on the timeline: its disc, then its words. `line` runs on to the next stop's disc. */
function Stop({
  disc,
  line,
  ms,
  children,
}: {
  disc: ReactNode;
  line: "solid" | "dashed" | null;
  ms: number;
  children: ReactNode;
}) {
  return (
    <li className={`${styles.enter} relative flex items-start gap-3 pb-2.5 canvas:pb-[5px]`} style={delay(ms)}>
      {line && (
        <span
          className={`absolute left-[15px] top-4 h-full border-l-[3px] ${line === "solid" ? "border-[#12ca99]/60" : "border-dashed border-[#12ca99]/60"}`}
          aria-hidden="true"
        />
      )}
      {disc}
      <span className="min-w-0 text-sm leading-snug text-[#5b6770] canvas:text-[14px] canvas:leading-tight">{children}</span>
    </li>
  );
}

/** The right column: from sample to genome, one step under the other, then what's next and the partners. */
function ProjectJourney({ project, audience }: { project: TourProject; audience: Audience }) {
  // Visual: the steps' labels only; no notes, plans or partners.
  const visual = audience === "visual";
  const next = visual ? null : project.next;
  const partners = visual ? [] : project.partners;
  const { steps } = project;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {(steps.length > 0 || next) && (
        <div>
          {steps.length > 0 && <p className={`${KICKER} text-[#0a7558]`}>From sample to genome</p>}
          <ol className={steps.length > 0 ? "mt-3 canvas:mt-2" : ""}>
            {steps.map((step, i) => {
              const Icon = stepIcon(step.label);
              const following = i < steps.length - 1 ? steps[i + 1]! : null;
              const line = following ? (following.state === "done" ? "solid" : "dashed") : next ? "dashed" : null;
              return (
                <Stop
                  key={step.label}
                  line={line}
                  ms={300 + i * 110}
                  disc={
                    <span
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 ${
                        step.state === "done"
                          ? "border-[#12ca99] bg-[#12ca99] text-white"
                          : step.state === "now"
                            ? "border-[#12ca99] bg-white text-[#0a7558] shadow-[0_0_0_4px_rgba(18,202,153,0.18)]"
                            : "border-[#2b3278]/15 bg-white text-[#2b3278]"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  }
                >
                  <span className="block font-bold text-[#2b3278] canvas:text-[16px]">{step.label}</span>
                  {!visual && step.note}
                  <span className="sr-only">
                    {step.state === "done" ? " (done)" : step.state === "now" ? " (in progress)" : " (coming next)"}
                  </span>
                </Stop>
              );
            })}
            {next && (
              <Stop
                line={null}
                ms={300 + steps.length * 110}
                disc={
                  <span
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#12ca99] bg-white text-[#0a7558]"
                    aria-hidden="true"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                }
              >
                <span className="block font-bold text-[#0a7558] canvas:text-[16px]">What&rsquo;s next</span>
                <span className="canvas:leading-snug">
                  <TourCopy text={next} audience={audience} />
                </span>
              </Stop>
            )}
          </ol>
        </div>
      )}
      {partners.length > 0 && (
        <div className={`${styles.enter} canvas:mt-auto`} style={delay(860)}>
          <p className={`${KICKER} text-[#5b6770]`}>In partnership with</p>
          <ul className="mt-2 flex flex-wrap gap-2 canvas:mt-1.5">
            {partners.map((partner) => (
              <li
                key={partner}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-[#2b3278] ring-1 ring-[#2b3278]/10 canvas:text-[15px]"
              >
                {partner}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The slide's main element: photo | story | journey, each column only when the project has something for it. */
export function ProjectFeature({ project, audience }: { project: TourProject; audience: Audience }) {
  const photo = hasPhoto(project);
  const journey = hasJourney(project, audience === "visual");
  const columns = photo
    ? journey
      ? "canvas:grid-cols-[250px_minmax(0,1fr)_300px]"
      : "canvas:grid-cols-[410px_minmax(0,1fr)]"
    : journey
      ? "canvas:grid-cols-[minmax(0,1fr)_300px]"
      : "canvas:grid-cols-1";
  return (
    <article className={`${styles.enter} flex flex-col gap-6 canvas:grid canvas:h-full canvas:gap-6 ${columns}`} style={delay(220)}>
      {photo && <ProjectPhoto project={project} />}
      <ProjectStory project={project} audience={audience} />
      {journey && <ProjectJourney project={project} audience={audience} />}
    </article>
  );
}

/** The paper, beside the slide's title: its name, its address and a QR code to scan. */
export function ProjectPaper({ project }: { project: TourProject }) {
  const citation = project.citation;
  if (!citation) return null;
  return (
    <div className="flex flex-row-reverse items-center justify-end gap-3 canvas:-mt-7 canvas:flex-row canvas:text-right">
      <p className="min-w-0 text-[13px] leading-snug text-[#5b6770] canvas:text-[14px]">
        <span className={`${KICKER} block text-[#0a7558]`}>Read the paper</span>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 font-bold text-[#2b3278] underline-offset-2 hover:underline canvas:text-[16px]"
        >
          {citation.text}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <span className="block break-all">{citation.url.replace(/^https?:\/\//, "")}</span>
      </p>
      <span className="shrink-0 rounded-lg bg-white p-1.5 shadow-[0_6px_18px_-10px_rgba(43,50,120,0.35)] ring-1 ring-[#2b3278]/10">
        <DoiQr url={citation.url} label={`QR code linking to ${citation.text}`} className="block h-[72px] w-[72px]" />
      </span>
    </div>
  );
}
