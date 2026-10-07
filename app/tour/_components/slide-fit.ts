import { useEffect, type RefObject } from "react";

/**
 * Smallest scale a slide is shrunk to in Present mode. Projected text stays
 * legible well below full size; a slide that still doesn't fit scrolls.
 */
export const MIN_SLIDE_ZOOM = 0.6;

/**
 * Largest scale a slide is grown to, so a slide with room to spare fills the
 * screen instead of floating in the middle of it.
 */
export const MAX_SLIDE_ZOOM = 1.5;

/** Room kept clear at the bottom for the floating Present-mode controls. */
const CONTROLS_PX = 64;

/**
 * Largest zoom between MIN_SLIDE_ZOOM and MAX_SLIDE_ZOOM (in steps of 0.01) for which
 * `fits` holds, or MIN_SLIDE_ZOOM if none does. A binary search, because a
 * wider layout can reflow into fewer rows, so height isn't proportional to zoom.
 */
export function largestFittingZoom(fits: (zoom: number) => boolean): number {
  if (fits(MAX_SLIDE_ZOOM)) return MAX_SLIDE_ZOOM;
  let lo = Math.round(MIN_SLIDE_ZOOM * 100);
  let hi = Math.round(MAX_SLIDE_ZOOM * 100);
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid / 100)) lo = mid;
    else hi = mid;
  }
  return lo / 100;
}

/** Children that take up space: the backgrounds are absolutely positioned. */
function inFlowChildren(slide: HTMLElement): HTMLElement[] {
  return [...slide.children].filter((child): child is HTMLElement => {
    const position = getComputedStyle(child).position;
    return position !== "absolute" && position !== "fixed";
  });
}

function contentHeight(slide: HTMLElement): number {
  return inFlowChildren(slide).reduce((sum, child) => sum + child.getBoundingClientRect().height, 0);
}

function applyZoom(slide: HTMLElement, zoom: number) {
  slide.style.zoom = zoom === 1 ? "" : String(zoom);
}

/** Scales one slide (a section's first child) so its content fills the screen. */
function fitSlide(slide: HTMLElement, available: number) {
  const zoom = largestFittingZoom((z) => {
    applyZoom(slide, z);
    // Read on screen, so the zoom is already applied; this forces a layout.
    return contentHeight(slide) <= available;
  });
  applyZoom(slide, zoom);
}

/**
 * In Present mode, scales each slide (CSS zoom, so layout follows) to the
 * largest size that fits above the controls, growing short slides and
 * shrinking tall ones. Refits when the window or any slide's content changes
 * size, and clears it all on exit.
 */
export function useSlideFit(
  presenting: boolean,
  sectionRefs: RefObject<(HTMLElement | null)[]>,
  headerRef: RefObject<HTMLElement | null>,
  deps: unknown,
) {
  useEffect(() => {
    const slides = () =>
      (sectionRefs.current ?? []).flatMap((section) => {
        const slide = section?.firstElementChild;
        return slide instanceof HTMLElement ? [slide] : [];
      });
    if (!presenting || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const fitAll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The header is hidden while presenting, so this is normally 0.
        const available = window.innerHeight - (headerRef.current?.offsetHeight ?? 0) - CONTROLS_PX;
        for (const slide of slides()) fitSlide(slide, available);
      });
    };

    const observer = new ResizeObserver(fitAll);
    for (const slide of slides()) for (const child of inFlowChildren(slide)) observer.observe(child);
    window.addEventListener("resize", fitAll);
    fitAll();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", fitAll);
      for (const slide of slides()) slide.style.zoom = "";
    };
  }, [presenting, sectionRefs, headerRef, deps]);
}
