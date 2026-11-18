import { useEffect, type RefObject } from "react";
import slideStyles from "./slide.module.css";

/*
 * The decks' fit check, for the tour's canvas: a slide never shrinks its text
 * to fit, so a slide that runs past its bottom margin, a title over two lines
 * or text under 14px is a content problem, to be fixed by cutting words.
 *
 * In development each problem is logged with its slide and audience, and the
 * slide gets a red outline. On the live site (where a tour.json edit can
 * arrive unchecked) a slide whose main element still runs over is shrunk just
 * enough, never below MIN_SAFETY_SCALE, so no words are cut off in front of
 * visitors.
 */

export const MIN_SAFETY_SCALE = 0.85;
/** The smallest text the decks allow on a slide, outside sources and the footer. */
const MIN_TEXT_PX = 14;
/** A light slide's content area: 720 less the 68px top and 80px bottom margins, and 12px more with a source. */
const WRAP_PX = 572;
const WRAP_WITH_SOURCE_PX = 560;
/** The slide title's size on the canvas, which tells the zoom the browser reports sizes at. */
const TITLE_PX = 46;

export type FitProblem = { slide: number; id: string; problem: string };

const OVERFLOWING = slideStyles.overflowing ?? "overflowing";
const HAS_SOURCE = slideStyles.hasSource ?? "hasSource";

/** The scale that makes `needed` fit in `available`, within [MIN_SAFETY_SCALE, 1]. */
export function safetyScale(available: number, needed: number): number {
  if (needed <= available || needed <= 0) return 1;
  return Math.max(MIN_SAFETY_SCALE, Math.floor((available / needed) * 1000) / 1000);
}

function shrink(fit: HTMLElement, scale: number) {
  if (scale === 1) {
    fit.style.transform = "";
    fit.style.width = "";
    fit.style.height = "";
    return;
  }
  // Laid out in a box 1/scale as large, then drawn at scale, so it fills the main element exactly.
  fit.style.transformOrigin = "0 0";
  fit.style.transform = `scale(${scale})`;
  fit.style.width = `${100 / scale}%`;
  fit.style.height = `${100 / scale}%`;
}

/**
 * How far below `container`'s top its HTML content reaches, from the layout
 * boxes (offsetTop/offsetHeight): entrance animations move things with
 * transforms, which a scrollHeight would count. `container` must be positioned.
 */
function contentBox(container: HTMLElement): { top: number; bottom: number } {
  let top = Infinity;
  let bottom = 0;
  for (const el of container.querySelectorAll<HTMLElement>("*")) {
    if (!(el instanceof HTMLElement) || el.offsetParent === null) continue;
    let y = el.offsetTop;
    let parent = el.offsetParent as HTMLElement | null;
    while (parent && parent !== container) {
      y += parent.offsetTop;
      parent = parent.offsetParent as HTMLElement | null;
    }
    if (parent !== container) continue;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + el.offsetHeight);
  }
  return { top: Number.isFinite(top) ? top : 0, bottom };
}

const contentBottom = (container: HTMLElement) => contentBox(container).bottom;

/**
 * A dark slide (welcome, contact) centres its words between the margins, so
 * too many runs past both the top and the bottom one. Its size on the canvas
 * is the 720px slide less the 68px and 80px margins.
 */
function checkDark(section: HTMLElement, report: (problem: string) => void) {
  const inner = section.querySelector<HTMLElement>("[data-slide-inner]");
  if (!inner) return;
  const k = inner.clientHeight / WRAP_PX;
  if (!(k > 0)) return;
  const { top, bottom } = contentBox(inner);
  const past = Math.round((Math.max(0, -top) + Math.max(0, bottom - inner.clientHeight)) / k);
  if (past > 1) report(`runs ${past}px past its margins`);
}

/** Text only screen readers get (Tailwind's sr-only, at any breakpoint) has no size to check. */
const SCREEN_READER_ONLY = '[class*="sr-only"]';

function textUnder(wrap: HTMLElement, minPx: number, zoom: number): string[] {
  const found: string[] = [];
  for (const el of wrap.querySelectorAll<HTMLElement>("*")) {
    if (el instanceof SVGElement || el.closest(`svg, ${SCREEN_READER_ONLY}`)) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (!ownText || el.getClientRects().length === 0) continue;
    const px = parseFloat(getComputedStyle(el).fontSize) / zoom;
    if (px < minPx - 0.25) found.push(`"${el.textContent?.trim().slice(0, 30)}" at ${px.toFixed(1)}px`);
  }
  return found;
}

/** Checks every slide in `main`, fixes what it can on the live site, and returns what it found. */
export function checkSlides(main: HTMLElement, { live }: { live: boolean }): FitProblem[] {
  const problems: FitProblem[] = [];
  const sections = [...main.querySelectorAll<HTMLElement>(":scope > section")];
  sections.forEach((section, i) => {
    const wrap = section.querySelector<HTMLElement>("[data-slide-wrap]");
    const main = section.querySelector<HTMLElement>("[data-slide-main]");
    const fit = section.querySelector<HTMLElement>("[data-slide-fit]");
    const title = section.querySelector<HTMLElement>("[data-slide-title]");
    const report = (problem: string) => problems.push({ slide: i + 1, id: section.id, problem });
    if (!wrap) return checkDark(section, report);
    if (!main || !fit || !title) return;
    const frame = wrap.parentElement!;
    shrink(fit, 1);
    frame.classList.remove(OVERFLOWING);

    const hasSource = frame.classList.contains(HAS_SOURCE);
    // Sizes come back in the browser's units for this zoom; the wrap's known height converts them to canvas px.
    const k = wrap.clientHeight / (hasSource ? WRAP_WITH_SOURCE_PX : WRAP_PX);
    if (!(k > 0)) return;

    const needed = contentBottom(main);
    const pastMain = Math.round((needed - main.clientHeight) / k);
    const pastWrap = Math.round((contentBottom(wrap) - wrap.clientHeight) / k);
    const past = Math.max(pastMain, pastWrap);
    if (past > 1) {
      report(`runs ${past}px past its bottom margin`);
      if (live) shrink(fit, safetyScale(main.clientHeight, needed));
      else frame.classList.add(OVERFLOWING);
    }

    const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
    if (lineHeight > 0 && title.clientHeight / lineHeight > 2.1) report("has a title over two lines");

    if (!live) {
      const zoom = parseFloat(getComputedStyle(title).fontSize) / TITLE_PX;
      for (const text of textUnder(wrap, MIN_TEXT_PX, zoom)) report(`has text under ${MIN_TEXT_PX}px: ${text}`);
    }
  });
  return problems;
}

/** Time for content that arrives late (the tree, the virus, the photos) before the live site checks again. */
const LATE_CONTENT_MS = 2500;

/**
 * Runs the check on the canvas (768px and up) once the fonts are in and on
 * every audience change. In development it runs again whenever a slide's
 * content changes size and logs what it finds; the live site checks once more
 * after late content, since its own shrinking would set off an observer.
 */
export function useFitCheck(mainRef: RefObject<HTMLElement | null>, audience: string, slideIds: readonly string[]) {
  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof ResizeObserver === "undefined") return;
    if (!window.matchMedia?.("(width >= 48rem)").matches) return;
    const live = process.env.NODE_ENV === "production";
    let frame = 0;
    let last = "";
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const problems = checkSlides(main, { live });
        (window as Window & { __TOUR_FIT__?: FitProblem[] }).__TOUR_FIT__ = problems;
        const summary = problems.map((p) => `Slide ${p.slide} (${p.id}) ${p.problem}`).join("\n");
        if (!live && summary && summary !== last) console.warn(`Lab tour fit check (${audience}):\n${summary}`);
        last = summary;
      });
    };
    let observer: ResizeObserver | null = null;
    let timer = 0;
    if (live) {
      timer = window.setTimeout(run, LATE_CONTENT_MS);
    } else {
      observer = new ResizeObserver(run);
      for (const fit of main.querySelectorAll("[data-slide-fit]")) for (const child of fit.children) observer.observe(child);
    }
    document.fonts?.ready.then(run);
    run();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [mainRef, audience, slideIds]);
}
