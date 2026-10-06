import { useEffect, useRef, useState } from "react";

export type RevealState = "pending" | "visible";

/**
 * Flips to "visible" the first time the element scrolls into view. Put the
 * state on the element as `data-reveal` so tour-motion.module.css can hold
 * its entrance animations until then.
 */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>("pending");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
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
