import { DarkSlide } from "../slide-frame";
import { LogoHelix } from "../logo-helix";
import { SectionBackdrop } from "../section-backdrop";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { stagger, type SlideProps } from "./shared";

/** The decks' title slide: words and the two facts on the left, the helix on the right. */
export function WelcomeSlide({ content, audience }: Omit<SlideProps, "meta">) {
  const { hero } = content;
  return (
    <DarkSlide
      background="linear-gradient(135deg,#2b3278 0%,#5e205e 45%,#2a7797 85%,#12ca99 130%)"
      innerClassName="canvas:flex canvas:flex-col canvas:items-start canvas:justify-center"
      art={
        <>
          <SectionBackdrop variant="hero" />
          {/* Keeps the headline side dark enough for white text over the aurora. */}
          <span
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(28,33,82,0.7)_0%,rgba(28,33,82,0.35)_50%,transparent_80%)]"
            aria-hidden="true"
          />
          <LogoHelix
            onDark
            animate
            className="pointer-events-none absolute hidden canvas:-right-10 canvas:top-[300px] canvas:block canvas:w-[560px] canvas:opacity-70"
          />
          <span
            className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#ff8601,#c51b4a,#8a2990,#0176c3)]"
            aria-hidden="true"
          />
        </>
      }
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0d8] canvas:text-[14px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#12ca99]" aria-hidden="true" />
        {hero.eyebrow}
      </p>
      <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-balance canvas:max-w-[640px] canvas:text-[64px] canvas:leading-[1.05]">
        {hero.title}
      </h1>
      {audience !== "visual" && (
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 canvas:max-w-[576px] canvas:text-[22px] canvas:leading-normal">
          <TourCopy text={hero.intro} audience={audience} />
        </p>
      )}
      {hero.facts.length > 0 && (
        // One row of equal cards as wide as the longest label, so the labels stay on one line.
        <dl className="mt-12 grid grid-cols-2 gap-3 canvas:mt-10 canvas:w-fit canvas:auto-cols-fr canvas:grid-flow-col canvas:grid-cols-none canvas:gap-4">
          {hero.facts.map((fact, i) => (
            <div
              key={fact.label}
              className={`flex flex-col-reverse justify-end rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 backdrop-blur-sm ${styles.enter}`}
              style={stagger(i, 400)}
            >
              <dt className="mt-1 text-balance text-sm font-medium text-white/75 canvas:text-[14px]">{fact.label}</dt>
              {/* No count-up here: the opening slide must not wait for JavaScript to show its numbers. */}
              <dd className="text-3xl font-black tracking-tight canvas:text-[36px] canvas:leading-tight">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </DarkSlide>
  );
}
