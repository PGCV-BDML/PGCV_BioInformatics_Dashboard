import type { CSSProperties } from "react";
import { DarkSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import { BASE_COLOR, pairCentre, TurningHelix, type Base, type HelixPlacement } from "../turning-helix";
import { useOnScreen } from "../use-reveal";
import styles from "../tour-motion.module.css";
import art from "./welcome.module.css";
import { BrandLine, DARK_SLIDE_BACKGROUND, DarkSlideArt, GradientLastWord } from "./dark-parts";
import { delay, stagger, type SlideProps } from "./shared";

const BASE_CLASS: Record<Base, string | undefined> = { A: art.A, C: art.C, G: art.G, T: art.T };

/* An illustration, not real data: the read the helix is sequenced into. */
const READ = "TACGGAGGGTGCAAGCGTTAATCGGA";
const QUALITY = "IIIIIHHHHGGGFFFIIIHHHGGGFF";

/** The helix down the right side: 28 pairs, from above the slide to below it, tilted 14°. */
const STANDING_HELIX: HelixPlacement = { x: 1000, y: 360, pairs: 28, tilt: 14 };
/* The read's card, and where its sequence line's letters sit. */
const READ_CARD = { x: 836, y: 468 };
const READ_CHAR = { x: READ_CARD.x + 16, width: 9.6, y: READ_CARD.y + 34 + 12 + 25.6 - 4 };

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

/** Bases leaving the upper helix for their places in the read, one every 0.55 seconds. */
function FlyingBases() {
  return [4, 6, 8, 10, 12, 5, 9, 11, 7].map((pair, k) => {
    const [x, y] = pairCentre(STANDING_HELIX, pair);
    const at = 1 + k * 3; // the read's 2nd, 5th … 26th base
    const base = READ[at] as Base;
    return (
      <span
        key={k}
        className={art.fly}
        style={css({
          "--c": BASE_COLOR[base],
          "--x0": `${(x - 8).toFixed(0)}px`,
          "--y0": `${(y - 14).toFixed(0)}px`,
          "--x1": `${(READ_CHAR.x + at * READ_CHAR.width).toFixed(0)}px`,
          "--y1": `${READ_CHAR.y.toFixed(0)}px`,
          "--d": `${(k * 0.55).toFixed(2)}s`,
        })}
      >
        {base}
      </span>
    );
  });
}

/** The read the bases land in: a FASTQ record that types itself out. */
function ReadCard() {
  return (
    <div className={art.read} style={{ left: READ_CARD.x, top: READ_CARD.y }}>
      <div className={art.readBar}>
        <i style={{ background: "#ff8601" }} />
        <i style={{ background: "#9c1f7a" }} />
        <i style={{ background: "#0176c3" }} />
        &nbsp;reads.fastq
      </div>
      <div className={art.readBody}>
        <span className={`${art.line} ${art.dim}`}>@PGCV_0421 1:N:0:ATCACG</span>
        <span className={`${art.line} ${art.type}`} style={css({ "--n": READ.length, "--d": "1.2s" })}>
          {[...READ].map((b, i) => (
            <span key={i} className={BASE_CLASS[b as Base]}>
              {b}
            </span>
          ))}
        </span>
        <span className={`${art.line} ${art.dim}`}>+</span>
        <span className={`${art.line} ${art.dim} ${art.type}`} style={css({ "--n": QUALITY.length, "--d": "2.6s" })}>
          {QUALITY}
        </span>
      </div>
    </div>
  );
}

type Fact = { value: string; label: string };

/** A fact's picture, from its wording: the cluster's cores, or its storage filling up. */
export function factPicture(fact: Fact): "cores" | "storage" | null {
  const words = `${fact.value} ${fact.label}`.toLowerCase();
  if (/\b(cpus?|cores?)\b/.test(words)) return "cores";
  if (/\b(tb|pb|storage)\b/.test(words)) return "storage";
  return null;
}

/** A fixed scatter in [0, 1000) for square `i`, so the server and the browser draw the same pattern. */
function scatter(i: number, salt: number): number {
  return ((Math.imul(i + 1, 2654435761) ^ Math.imul(salt, 40503)) >>> 0) % 1000;
}

/** One square per core, up to 400, each lighting up as jobs come and go. */
function Cores({ count }: { count: number }) {
  return (
    <span className={art.cores}>
      {Array.from({ length: Math.max(1, Math.min(400, count)) }, (_, i) => (
        <i
          key={i}
          className={art.core}
          style={css({ "--d": `${((scatter(i, 1) / 1000) * 3.2).toFixed(2)}s`, "--o": scatter(i, 2) < 450 ? 1 : 0.22 })}
        />
      ))}
    </span>
  );
}

function StorageGauge() {
  return (
    <span className={art.disk}>
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} className={art.bar} style={css({ "--d": `${(i * 0.12).toFixed(2)}s` })} />
      ))}
    </span>
  );
}

/**
 * The title slide: the lab's logo and the words on the left, held still once
 * they have risen in; on the right, a double helix turning, its bases flying
 * into a sequencing read. The two facts carry a picture each: the cluster's
 * cores at work and its storage.
 */
export function WelcomeSlide({ content, audience }: Omit<SlideProps, "meta">) {
  const { hero } = content;
  const [screenRef, onScreen] = useOnScreen<HTMLSpanElement>();
  const paused = onScreen === false ? (art.paused ?? "") : "";
  return (
    <DarkSlide
      background={DARK_SLIDE_BACKGROUND}
      innerClassName={`${art.slide} canvas:flex canvas:flex-col canvas:items-start canvas:justify-center`}
      art={
        <DarkSlideArt screenRef={screenRef}>
          <div className={`${art.slide} ${art.art} ${paused}`} aria-hidden="true">
            <TurningHelix placement={STANDING_HELIX} />
            <FlyingBases />
            <ReadCard />
          </div>
        </DarkSlideArt>
      }
    >
      <BrandLine eyebrow={hero.eyebrow} />
      <h1
        className={`mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-balance canvas:mt-4 canvas:max-w-[640px] canvas:text-[64px] canvas:leading-[1.05] ${styles.enter}`}
        style={delay(250)}
      >
        <GradientLastWord text={hero.title} />
      </h1>
      {audience !== "visual" && (
        <p
          className={`mt-6 max-w-2xl text-lg leading-relaxed text-white/85 canvas:mt-3.5 canvas:max-w-[640px] canvas:text-[22px] canvas:leading-normal ${styles.enter}`}
          style={delay(400)}
        >
          <TourCopy text={hero.intro} audience={audience} />
        </p>
      )}
      {hero.facts.length > 0 && (
        <dl className={`mt-12 grid grid-cols-2 gap-3 canvas:mt-[22px] canvas:flex canvas:gap-4 ${paused}`}>
          {hero.facts.map((fact, i) => {
            const picture = factPicture(fact);
            const cores = Number.parseInt(fact.value.replace(/,/g, ""), 10);
            return (
              <div
                key={fact.label}
                className={`grid content-start rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 backdrop-blur-sm canvas:grid-cols-[auto_auto] canvas:items-center canvas:gap-x-[18px] canvas:py-3 ${styles.enter}`}
                style={stagger(i, 550)}
              >
                <dt className="row-start-2 mt-1 text-balance text-sm font-medium text-white/75 canvas:mt-0.5 canvas:max-w-[130px] canvas:text-[14px] canvas:leading-snug">
                  {fact.label}
                </dt>
                {/* No count-up here: the opening slide must not wait for JavaScript to show its numbers. */}
                <dd className="contents">
                  <span className="row-start-1 text-3xl font-black tracking-tight canvas:text-[36px] canvas:leading-tight">{fact.value}</span>
                  {picture && (
                    <span className="hidden canvas:col-start-2 canvas:row-span-2 canvas:row-start-1 canvas:block" aria-hidden="true">
                      {picture === "cores" && Number.isFinite(cores) ? <Cores count={cores} /> : picture === "storage" ? <StorageGauge /> : null}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </DarkSlide>
  );
}
