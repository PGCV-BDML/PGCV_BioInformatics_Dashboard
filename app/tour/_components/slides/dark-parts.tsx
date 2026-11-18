/* eslint-disable @next/next/no-img-element -- the white logo is a static asset inside a zoomed canvas. */
import type { ReactNode, Ref } from "react";
import { SectionBackdrop } from "../section-backdrop";
import styles from "../tour-motion.module.css";
import { delay } from "./shared";

/*
 * What the tour's two dark slides, the title slide and the contact slide,
 * share: so the tour opens and closes on the same look.
 */

/** The decks' dark gradient: navy through plum to teal. */
export const DARK_SLIDE_BACKGROUND = "linear-gradient(135deg,#2b3278 0%,#5e205e 45%,#2a7797 85%,#12ca99 130%)";

/**
 * The art behind a dark slide's words: the aurora and the moving A, C, G, T
 * letters, a shade that keeps the words' side dark enough for white text,
 * the slide's own art (`children`), and the logo-colour line along the bottom.
 *
 * `screenRef` gets a box the size of the slide, for telling when the slide is
 * on screen: unlike the art, which phones don't show, it is always laid out.
 */
export function DarkSlideArt({ children, screenRef }: { children?: ReactNode; screenRef?: Ref<HTMLSpanElement> }) {
  return (
    <>
      {screenRef && <span ref={screenRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />}
      <SectionBackdrop />
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(28,33,82,0.75)_0%,rgba(28,33,82,0.4)_50%,rgba(28,33,82,0.1)_80%)]"
        aria-hidden="true"
      />
      {children}
      <span
        className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#ff8601,#c51b4a,#8a2990,#0176c3)]"
        aria-hidden="true"
      />
    </>
  );
}

/** The slide's first line: the white PGC Visayas logo, then the eyebrow. */
export function BrandLine({ eyebrow }: { eyebrow: ReactNode }) {
  return (
    <div className={`flex items-center gap-4 ${styles.enter}`} style={delay(100)}>
      <img src="/assets/PGC-VSF_Logo-W.png" alt="Philippine Genome Center Visayas" width={118} height={40} className="h-8 w-auto canvas:h-9" />
      <p className="border-l border-white/25 pl-4 font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0d8] canvas:text-[14px]">
        {eyebrow}
      </p>
    </div>
  );
}

/** A title split before its last word. */
export function splitLastWord(title: string): [string, string] {
  const trimmed = title.trim();
  const at = trimmed.lastIndexOf(" ");
  return at < 0 ? ["", trimmed] : [trimmed.slice(0, at + 1), trimmed.slice(at + 1)];
}

/** A title with its last word in the mint-to-sky gradient. */
export function GradientLastWord({ text }: { text: string }) {
  const [head, last] = splitLastWord(text);
  return (
    <>
      {head}
      <span className="bg-[linear-gradient(90deg,#9ff0d8,#5aaef0)] bg-clip-text text-transparent">{last}</span>
    </>
  );
}
