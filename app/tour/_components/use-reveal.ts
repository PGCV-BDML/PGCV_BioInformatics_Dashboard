import { useEffect, useRef, useState } from "react";

/**
 * "pending" holds entrance animations on their first frame, "visible" plays
 * them, and "reset" (one or two frames, while off screen) removes them so
 * they start over from the beginning next time.
 */
export type RevealState = "pending" | "visible" | "reset";

/**
 * The sticky tour header (about 71 px) hides the bottom of the slide above,
 * so anything only under it counts as off screen, for both observers alike.
 */
const HEADER_PX = 80;

/**
 * Calls `show` when `el` scrolls into view and `hide` once it has left the
 * screen completely (or sits only behind the header), as often as that
 * happens. Returns a cleanup function.
 */
export function watchReveal(
  el: Element,
  show: () => void,
  hide: () => void,
  bottomMargin = "-10%",
): () => void {
  // Shown once it is a little way into the screen; hidden once it is gone.
  const entering = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) show();
    },
    { rootMargin: `-${HEADER_PX}px 0px ${bottomMargin} 0px` },
  );
  const leaving = new IntersectionObserver(
    (entries) => {
      const last = entries.at(-1);
      if (last && !last.isIntersecting) hide();
    },
    { rootMargin: `-${HEADER_PX}px 0px 0px 0px` },
  );
  entering.observe(el);
  leaving.observe(el);
  return () => {
    entering.disconnect();
    leaving.disconnect();
  };
}

/**
 * Runs `rewind` ("reset"), then after two frames `hold` ("pending"). The
 * frame in between lets the browser drop the old animations, so they replay
 * from the start instead of staying finished. Returns a cancel function.
 */
export function rewindReveal(rewind: () => void, hold: () => void): () => void {
  rewind();
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(hold);
  });
  return () => cancelAnimationFrame(frame);
}

/**
 * Flips to "visible" whenever the element scrolls into view, and back to
 * "pending" once it has left the screen, so its entrance replays each time
 * the visitor returns. Put the state on the element as `data-reveal` so
 * tour-motion.module.css can hold its entrance animations until then.
 */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>("pending");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let cancel = () => {};
    let shown = false;
    const stop = watchReveal(
      el,
      () => {
        cancel();
        shown = true;
        setState("visible");
      },
      () => {
        if (!shown) return;
        shown = false;
        cancel = rewindReveal(
          () => setState("reset"),
          () => setState("pending"),
        );
      },
    );
    return () => {
      stop();
      cancel();
    };
  }, []);

  return [ref, state] as const;
}

/**
 * Tracks whether the element is on screen, so looping backgrounds can pause
 * while scrolled away. `null` until the first observation.
 */
export function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState<boolean | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const last = entries.at(-1);
      if (last) setOnScreen(last.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, onScreen] as const;
}
