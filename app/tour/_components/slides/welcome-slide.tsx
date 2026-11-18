/* eslint-disable @next/next/no-img-element -- the white logo is a static asset inside a zoomed canvas. */
import type { CSSProperties } from "react";
import { DarkSlide } from "../slide-frame";
import { SectionBackdrop } from "../section-backdrop";
import { TourCopy } from "../tour-copy";
import { useOnScreen } from "../use-reveal";
import styles from "../tour-motion.module.css";
import art from "./welcome.module.css";
import { delay, stagger, type SlideProps } from "./shared";

type Base = "A" | "C" | "G" | "T";
const PARTNER: Record<Base, Base> = { A: "T", T: "A", C: "G", G: "C" };
const BASE_COLOR: Record<Base, string> = { A: "var(--base-a)", C: "var(--base-c)", G: "var(--base-g)", T: "var(--base-t)" };
const BASE_CLASS: Record<Base, string | undefined> = { A: art.A, C: art.C, G: art.G, T: art.T };

/* An illustration, not real data: one strand of the helix, and the read it is sequenced into. */
const STRAND = "ATGCGTACCGGATTACAGCTTGACCGATCG";
const READ = "TACGGAGGGTGCAAGCGTTAATCGGA";
const QUALITY = "IIIIIHHHHGGGFFFIIIHHHGGGFF";

/* The helix on the canvas: 28 pairs 30px apart, tilted 14°, a full turn every 12 seconds. */
const PAIRS = 28;
const PAIR_GAP = 30;
const TURN_S = 12;
const HALF_WIDTH = 78;
const TILT = (14 * Math.PI) / 180;
const HELIX = { x: 1000, top: -60, height: 840 };
/* The read's card, and where its sequence line's letters sit. */
const READ_CARD = { x: 836, y: 468 };
const READ_CHAR = { x: READ_CARD.x + 16, width: 9.6, y: READ_CARD.y + 34 + 12 + 25.6 - 4 };

/** Where a bead stands at a point in its turn: across with cos, forward (bigger, brighter) with sin. */
function beadAt(progress: number) {
  const angle = progress * 2 * Math.PI;
  const depth = Math.sin(angle);
  return {
    "--x": `${(HALF_WIDTH * Math.cos(angle)).toFixed(1)}px`,
    "--k": (0.9 + 0.3 * depth).toFixed(3),
    "--o": (depth >= 0 ? 0.8 + 0.2 * depth : 0.8 + 0.4 * depth).toFixed(3),
    "--z": depth > 0.3 ? 3 : depth < -0.3 ? 1 : 2,
  };
}

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

/** The centre of pair `i` on the canvas, after the helix's tilt. */
function pairCentre(i: number): [number, number] {
  const fromMiddle = i * PAIR_GAP - HELIX.height / 2;
  return [HELIX.x - fromMiddle * Math.sin(TILT), HELIX.top + HELIX.height / 2 + fromMiddle * Math.cos(TILT)];
}

function Helix() {
  return (
    <div className={art.helix}>
      {Array.from({ length: PAIRS }, (_, i) => {
        const base = STRAND[i % STRAND.length] as Base;
        const partner = PARTNER[base];
        // Each pair is a twelfth of a turn on from the one above.
        const progress = (i % TURN_S) / TURN_S;
        return (
          <div key={i} className={art.pair} style={{ top: i * PAIR_GAP }}>
            <span
              className={art.rung}
              style={css({
                "--c1": BASE_COLOR[base],
                "--c2": BASE_COLOR[partner],
                "--r": Math.cos(progress * 2 * Math.PI).toFixed(3),
                "--d": `${-i}s`,
              })}
            />
            <span className={art.bead} style={css({ "--c": BASE_COLOR[base], ...beadAt(progress), "--d": `${-i}s` })} />
            <span
              className={art.bead}
              style={css({ "--c": BASE_COLOR[partner], ...beadAt(progress + 0.5), "--d": `${-i - TURN_S / 2}s` })}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Bases leaving the upper helix for their places in the read, one every 0.55 seconds. */
function FlyingBases() {
  return [4, 6, 8, 10, 12, 5, 9, 11, 7].map((pair, k) => {
    const [x, y] = pairCentre(pair);
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

/** The title with its last word in the mint-to-sky gradient. */
function splitLastWord(title: string): [string, string] {
  const trimmed = title.trim();
  const at = trimmed.lastIndexOf(" ");
  return at < 0 ? ["", trimmed] : [trimmed.slice(0, at + 1), trimmed.slice(at + 1)];
}

/**
 * The title slide: the lab's logo and the words on the left, held still once
 * they have risen in; on the right, a double helix turning, its bases flying
 * into a sequencing read. The two facts carry a picture each: the cluster's
 * cores at work and its storage.
 */
export function WelcomeSlide({ content, audience }: Omit<SlideProps, "meta">) {
  const { hero } = content;
  const [artRef, onScreen] = useOnScreen<HTMLDivElement>();
  const paused = onScreen === false ? (art.paused ?? "") : "";
  const [head, last] = splitLastWord(hero.title);
  return (
    <DarkSlide
      background="linear-gradient(135deg,#2b3278 0%,#5e205e 45%,#2a7797 85%,#12ca99 130%)"
      innerClassName={`${art.slide} canvas:flex canvas:flex-col canvas:items-start canvas:justify-center`}
      art={
        <>
          <SectionBackdrop variant="hero" />
          {/* Keeps the headline side dark enough for white text over the aurora. */}
          <span
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(28,33,82,0.75)_0%,rgba(28,33,82,0.4)_50%,rgba(28,33,82,0.1)_80%)]"
            aria-hidden="true"
          />
          <div ref={artRef} className={`${art.slide} ${art.art} ${paused}`} aria-hidden="true">
            <Helix />
            <FlyingBases />
            <ReadCard />
          </div>
          <span
            className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#ff8601,#c51b4a,#8a2990,#0176c3)]"
            aria-hidden="true"
          />
        </>
      }
    >
      <div className={`flex items-center gap-4 ${styles.enter}`} style={delay(100)}>
        <img src="/assets/PGC-VSF_Logo-W.png" alt="Philippine Genome Center Visayas" width={118} height={40} className="h-8 w-auto canvas:h-9" />
        <p className="border-l border-white/25 pl-4 font-quicksand text-xs font-bold uppercase tracking-[0.2em] text-[#9ff0d8] canvas:text-[14px]">
          {hero.eyebrow}
        </p>
      </div>
      <h1
        className={`mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-balance canvas:mt-4 canvas:max-w-[640px] canvas:text-[64px] canvas:leading-[1.05] ${styles.enter}`}
        style={delay(250)}
      >
        {head}
        <span className="bg-[linear-gradient(90deg,#9ff0d8,#5aaef0)] bg-clip-text text-transparent">{last}</span>
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
