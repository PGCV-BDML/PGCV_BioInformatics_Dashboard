import { useEffect, type RefObject } from "react";

/**
 * The slide canvas of the bioinfo-presentations decks: every slide is laid out
 * at exactly this size, then the whole tour is scaled by one factor.
 */
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

/** Room around the slides on the page: 16px each side, 24px above and below. */
const PAGE_GUTTER_X = 32;
const PAGE_GUTTER_Y = 48;
/** The page never shows a slide larger than this. */
const MAX_PAGE_SCALE = 2;

export type DeckScale = {
  /** The one scale for every slide. */
  s: number;
  /** In Present mode, the canvas px added on each side so the background reaches a non-16:9 screen's edges. */
  bleedX: number;
  bleedY: number;
};

/**
 * As the decks' engine works it out (scaleDeck() in template/starter.html):
 * on the page, as large as fits the window's width and the height under the
 * header; in Present mode, as large as fits the screen.
 */
export function deckScale({
  presenting,
  width,
  height,
  header = 0,
}: {
  presenting: boolean;
  width: number;
  height: number;
  header?: number;
}): DeckScale {
  const raw = presenting
    ? Math.min(width / CANVAS_W, height / CANVAS_H)
    : Math.min((width - PAGE_GUTTER_X) / CANVAS_W, (height - header - PAGE_GUTTER_Y) / CANVAS_H, MAX_PAGE_SCALE);
  const s = Number(Math.max(0.1, raw).toFixed(4));
  const bleed = (screen: number, canvas: number) => (presenting ? Math.max(0, Math.ceil((screen / s - canvas) / 2)) : 0);
  return { s, bleedX: bleed(width, CANVAS_W), bleedY: bleed(height, CANVAS_H) };
}

function apply(main: HTMLElement, { s, bleedX, bleedY }: DeckScale) {
  main.style.setProperty("--s", String(s));
  main.style.setProperty("--bleed-x", `${bleedX}px`);
  main.style.setProperty("--bleed-y", `${bleedY}px`);
}

/**
 * Runs as the page is parsed, before the first paint, so the server's HTML
 * shows at the window's scale rather than at 1280px for a moment. The same
 * sum as deckScale() for the page; Present mode always starts from a click.
 */
export function deckScaleScript(mainId: string, headerSelector: string): string {
  return `(function(){try{var m=document.getElementById(${JSON.stringify(mainId)});if(!m)return;var h=document.querySelector(${JSON.stringify(headerSelector)});var hh=h?h.offsetHeight:0;var s=Math.min((document.documentElement.clientWidth-${PAGE_GUTTER_X})/${CANVAS_W},(window.innerHeight-hh-${PAGE_GUTTER_Y})/${CANVAS_H},${MAX_PAGE_SCALE});s=Math.max(0.1,s);m.style.setProperty("--s",s.toFixed(4));m.style.setProperty("--bleed-x","0px");m.style.setProperty("--bleed-y","0px")}catch(e){}})()`;
}

/** Keeps the tour's scale in step with the window, and with Present mode. */
export function useDeckScale(
  mainRef: RefObject<HTMLElement | null>,
  headerRef: RefObject<HTMLElement | null>,
  presenting: boolean,
) {
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const update = () =>
      apply(
        main,
        deckScale({
          presenting,
          width: presenting ? window.innerWidth : document.documentElement.clientWidth,
          height: window.innerHeight,
          header: presenting ? 0 : (headerRef.current?.offsetHeight ?? 0),
        }),
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mainRef, headerRef, presenting]);
}
