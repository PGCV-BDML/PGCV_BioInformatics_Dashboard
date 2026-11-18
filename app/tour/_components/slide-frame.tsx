/* eslint-disable @next/next/no-img-element -- the logo is a fixed-size static asset inside a zoomed canvas. */
import type { CSSProperties, ReactNode } from "react";
import styles from "./slide.module.css";
import motion from "./tour-motion.module.css";

/** The words in every slide's footer, as in the decks' DECK.footerTitle. */
export const FOOTER_TITLE = "Lab tour · PGC Visayas";

/** Where a slide sits in the tour, for its footer. */
export type SlideMeta = { number: number; total: number };

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * A light slide: the decks' frame. The logo-gradient line and the dot grid,
 * then the eyebrow, the title (at most two lines), the intro under it, the
 * main element, the takeaway at the foot of the content area, and the footer
 * with the source, the logo, the tour's title and the slide number.
 *
 * On the canvas the main element gets the room left between the header and
 * the takeaway, so its children can fill it with `canvas:h-full`. `aside`
 * (a slide's headline numbers) sits at the right end of the title's row.
 */
export function LightSlide({
  meta,
  eyebrow,
  title,
  intro,
  takeaway,
  source,
  aside,
  children,
  mainClassName = "",
}: {
  meta: SlideMeta;
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  takeaway?: ReactNode;
  source?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className={`${styles.light} ${source ? styles.hasSource : ""}`} data-slide-frame="light">
      <span className={styles.topline} aria-hidden="true" />
      <span className={styles.dots} aria-hidden="true" />
      <div className={styles.wrap} data-slide-wrap>
        <p className={styles.eyebrow}>
          <span className={`${styles.ebar} ${motion.growX}`} aria-hidden="true" />
          <span className={motion.fadeIn} style={delay(150)}>
            {eyebrow}
          </span>
        </p>
        <h2 className={`${styles.title} ${motion.enter}`} style={delay(80)} data-slide-title>
          {title}
        </h2>
        {aside && (
          <div className={`${styles.aside} ${motion.enter}`} style={delay(240)}>
            {aside}
          </div>
        )}
        {intro && (
          <p className={`${styles.intro} ${motion.enter}`} style={delay(160)}>
            {intro}
          </p>
        )}
        <div className={`${styles.main} ${mainClassName}`} data-slide-main>
          {/* The box the fit check measures, and shrinks on the live site if it still runs over. */}
          <div className={styles.fit} data-slide-fit>
            {children}
          </div>
        </div>
        {takeaway && (
          <div className={styles.takeawayBlock}>
            <p className={`${styles.takeaway} ${motion.enter}`} style={delay(420)}>
              {takeaway}
            </p>
          </div>
        )}
      </div>
      <SlideFoot meta={meta} source={source} />
    </div>
  );
}

function SlideFoot({ meta, source }: { meta: SlideMeta; source?: ReactNode }) {
  return (
    <div className={styles.foot}>
      {source && <p className={styles.source}>{source}</p>}
      <div className={styles.footRow} aria-hidden="true">
        <img src="/assets/pgcv_logo.png" alt="" width={71} height={30} className={styles.logo} />
        <span className={styles.footMeta}>
          <span className={styles.footTitle}>{FOOTER_TITLE}</span>
          <span className={styles.slideNum}>
            {meta.number} / {meta.total}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * A dark slide (welcome, contact): the decks' gradient, with the content kept
 * inside the same margins as a light slide. `art` sits behind the content,
 * across the whole slide. No footer, as on the decks' title and thank-you slides.
 */
export function DarkSlide({
  art,
  background,
  innerClassName = "",
  children,
}: {
  art?: ReactNode;
  background: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.dark} style={{ background }} data-slide-frame="dark">
      {art}
      <div className={`${styles.darkInner} ${innerClassName}`} data-slide-inner>
        {children}
      </div>
    </div>
  );
}
