import { useEffect, useState, type CSSProperties } from "react";
import type { Audience } from "@/lib/tour";
import { JOURNEY_HPC_ADDRESS, JOURNEY_SEQUENCERS, JOURNEY_STEPS, type JourneyStepId } from "@/lib/tour-journey";
import { BRAND, CARD, LOGO, SERVICE_HEX } from "./brand";
import { TourCopy } from "./tour-copy";
import styles from "./tour-motion.module.css";

/*
 * The "From sample to sequence" stage: one scene per step (sample, sequencer,
 * storage, server, results), drawn on a 560×340 grid. Scenes play on a timer, or step
 * with the arrow keys while presenting (tour-experience passes `step`).
 */

/** How long each scene plays on its own; with auto-advance on, the slide stays up for all of them. */
export const JOURNEY_SCENE_MS = 5_000;

/** One sequencing round on the flow cell. */
const ROUND_MS = 800;

const NAVY = BRAND.navy;
const NIGHT = "#1c2152";
const MUTED = "#5b6770";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Base = "A" | "C" | "G" | "T";

/** Bright fills for the art, and darker inks for letters drawn on white. */
const BASE_FILL: Record<Base, string> = { A: BRAND.teal, C: "#38a3f5", G: LOGO.orange, T: "#f25c80" };
const BASE_INK: Record<Base, string> = { A: BRAND.tealInk, C: LOGO.blue, G: "#b35400", T: LOGO.crimson };

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const bases = (sequence: string) => sequence.split("") as Base[];

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// --- Sample: a tube, and the DNA extracted from it -------------------------------

/** One strand of the helix: eight half-turns, 35 units each. */
const strand = (sign: 1 | -1) => `M250 190q17.5 ${sign * 60} 35 0${"t35 0".repeat(7)}`;
const RUNGS = bases("ACGTTAGC");

function SampleScene() {
  return (
    <>
      <rect x={100} y={44} width={60} height={26} rx={6} fill={NAVY} />
      <path d="M110 170V262a20 20 0 0 0 40 0V170Z" fill={BRAND.teal} fillOpacity={0.4} className={styles.rise} style={d(200)} />
      <path d="M104 70V262a26 26 0 0 0 52 0V70" stroke={NAVY} strokeWidth={4} />
      <rect x={110} y={96} width={40} height={28} rx={4} fill="#ffffff" stroke={NAVY} strokeWidth={1.5} />
      <text x={130} y={115} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={MUTED}>
        S-01
      </text>
      <text x={206} y={176} textAnchor="middle" fontSize={13} fontWeight={600} fill={MUTED}>
        extract
      </text>
      <path d="M178 190H232M224 182l8 8-8 8" stroke={MUTED} strokeWidth={2.5} pathLength={1} className={styles.draw} style={d(500)} />
      <path d={strand(-1)} stroke={NAVY} strokeWidth={4} pathLength={1} className={styles.draw} style={d(800)} />
      <path d={strand(1)} stroke={SERVICE_HEX.magenta} strokeWidth={4} pathLength={1} className={styles.draw} style={d(800)} />
      {RUNGS.map((base, i) => (
        <line
          key={i}
          x1={267.5 + i * 35}
          x2={267.5 + i * 35}
          y1={164}
          y2={216}
          stroke={BASE_FILL[base]}
          strokeWidth={4}
          className={styles.pop}
          style={d(1100 + i * 90)}
        />
      ))}
      <text x={390} y={262} textAnchor="middle" fontSize={15} fontWeight={800} fill={NAVY}>
        DNA
      </text>
    </>
  );
}

// --- Sequencer: short pieces on a flow cell, one colour per spot per round -------

const FRAGMENTS = ["ACGTTA", "GCCTAG", "TTAGCC", "AGGATC", "CTAGGA", "GATCCA"];
const FRAGMENT_SHIFT = [0, 14, 6, 20, 4, 12];
const SPOT_COLUMNS = 12;
const SPOT_ROWS = 7;

/** A made-up but fixed letter for every spot and round, so server and browser draw the same. */
export function spotBase(spot: number, round: number): Base {
  let h = Math.imul(spot + 1, 0x9e3779b1) ^ Math.imul(round + 7, 0x85ebca77);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  return "ACGT"[(h >>> 13) & 3] as Base;
}

function SequencerScene({ running }: { running: boolean }) {
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!running || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setRound((r) => r + 1), ROUND_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <>
      {FRAGMENTS.map((sequence, row) => (
        <g key={sequence} className={styles.slideLeft} style={d(row * 110)}>
          {bases(sequence).map((base, i) => (
            <rect
              key={i}
              x={30 + FRAGMENT_SHIFT[row]! + i * 12}
              y={98 + row * 26}
              width={10}
              height={14}
              rx={3}
              fill={BASE_FILL[base]}
            />
          ))}
        </g>
      ))}
      <text x={76} y={284} textAnchor="middle" fontSize={13} fontWeight={600} fill={MUTED}>
        short pieces
      </text>
      <path d="M140 170H174M167 163l7 7-7 7" stroke={MUTED} strokeWidth={2.5} />
      <g className={styles.fadeIn} style={d(300)}>
        <rect x={196} y={60} width={334} height={230} rx={18} fill={NIGHT} />
        <text x={216} y={89} fontSize={11} fontWeight={700} letterSpacing={2} fill={BRAND.teal}>
          FLOW CELL
        </text>
        <rect x={438} y={74} width={74} height={22} rx={11} fill="#ffffff" fillOpacity={0.12} />
        <text x={475} y={89} textAnchor="middle" fontSize={12} fontWeight={700} fill="#ffffff">
          Round {round + 1}
        </text>
        {/* Remounted every round, so the spots flicker on and the camera flashes again. */}
        <g key={round}>
          {Array.from({ length: SPOT_COLUMNS * SPOT_ROWS }, (_, spot) => (
            <circle
              key={spot}
              cx={231 + (spot % SPOT_COLUMNS) * 24}
              cy={119 + Math.floor(spot / SPOT_COLUMNS) * 24}
              r={7}
              fill={BASE_FILL[spotBase(spot, round)]}
              className={styles.flicker}
            />
          ))}
          <rect x={196} y={60} width={334} height={230} rx={18} fill="#ffffff" className={styles.snap} />
        </g>
      </g>
      <text x={363} y={318} textAnchor="middle" fontSize={12} fontWeight={600} fill={MUTED}>
        Each spot is one piece, copied many times
      </text>
    </>
  );
}

// --- Storage: the sequencer sends its files to the storage server by itself ------

/** Files on the cable, a beat apart. */
const PACKET_DELAYS = [600, 1200, 1800];
/** How full each drive gets as the files land. */
const DRIVE_FILL = [76, 70, 76, 58, 66, 34];

function FileIcon() {
  return (
    <>
      <path d="M0 3a3 3 0 0 1 3-3h11l6 6v17a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3Z" fill="#ffffff" stroke={NAVY} strokeWidth={2} />
      <path d="M5 11h10M5 16h10M5 21h6" stroke={BRAND.teal} strokeWidth={2} />
    </>
  );
}

function StorageScene() {
  return (
    <>
      <g className={styles.fadeIn}>
        <rect x={24} y={104} width={150} height={128} rx={16} fill="#ffffff" stroke={NAVY} strokeWidth={3} />
        <rect x={40} y={120} width={84} height={52} rx={7} fill={NIGHT} />
        <circle cx={58} cy={146} r={9} fill={BRAND.teal} />
        <path d="M53.5 146.5l3 3 6-6.5" stroke={NIGHT} strokeWidth={2.2} />
        <text x={74} y={143} fontSize={10} fontWeight={700} fill="#ffffff">
          Run
        </text>
        <text x={74} y={156} fontSize={10} fontWeight={700} fill="#ffffff">
          done
        </text>
        <circle cx={154} cy={132} r={5} fill={BRAND.teal} className={styles.ledBlink} />
        <rect x={40} y={192} width={118} height={12} rx={6} fill="#f7f6fa" stroke={NAVY} strokeWidth={1.5} />
      </g>
      <text x={99} y={258} textAnchor="middle" fontSize={13} fontWeight={800} fill={NAVY}>
        Sequencer
      </text>

      <text x={286} y={146} textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing={1.6} fill={MUTED}>
        LAB NETWORK
      </text>
      <path d="M174 168H394" stroke={NAVY} strokeOpacity={0.2} strokeWidth={6} pathLength={1} className={styles.draw} style={d(200)} />
      <path d="M382 158l10 10-10 10" stroke={MUTED} strokeWidth={2.5} />
      {PACKET_DELAYS.map((ms) => (
        <g key={ms} className={styles.travel} style={{ ...d(ms), "--dx": "176px" } as CSSProperties}>
          <g transform="translate(186 155)">
            <FileIcon />
          </g>
        </g>
      ))}
      <rect x={240} y={184} width={92} height={24} rx={12} fill={BRAND.teal} fillOpacity={0.15} />
      <text x={286} y={200} textAnchor="middle" fontSize={12} fontWeight={700} fill={BRAND.tealInk}>
        Automatic
      </text>

      <g className={styles.fadeIn} style={d(150)}>
        <rect x={404} y={66} width={128} height={182} rx={12} fill="#ffffff" stroke={NAVY} strokeWidth={3} />
        {DRIVE_FILL.map((width, i) => (
          <g key={i}>
            <rect x={416} y={80 + i * 27} width={104} height={19} rx={4} fill="#f7f6fa" stroke={NAVY} strokeWidth={1.5} />
            <circle cx={426} cy={89.5 + i * 27} r={3} fill={BRAND.teal} className={styles.ledBlink} style={d(i * 200)} />
            {/* Each drive fills up as the files land. */}
            <rect
              x={436}
              y={85 + i * 27}
              width={width}
              height={9}
              rx={2}
              fill={BRAND.teal}
              fillOpacity={0.55}
              className={styles.growX}
              style={{ ...d(1000 + i * 300), transformBox: "fill-box" }}
            />
          </g>
        ))}
      </g>
      <text x={468} y={272} textAnchor="middle" fontSize={13} fontWeight={800} fill={NAVY}>
        Storage server
      </text>
    </>
  );
}

// --- Server: a laptop logs in, and overlapping reads are lined up into one sequence

const CONSENSUS = "ACGTTAGCCTAGGATCCA";
/** Reads as [start in CONSENSUS, length]; each overlaps the next. */
const READS: [number, number][] = [
  [0, 8],
  [3, 8],
  [6, 8],
  [8, 8],
  [10, 8],
];
const PITCH = 22;

function BaseCell({ base, x, y, rebuilt }: { base: Base; x: number; y: number; rebuilt?: boolean }) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={19}
        height={22}
        rx={5}
        fill={rebuilt ? BASE_FILL[base] : "#ffffff"}
        fillOpacity={rebuilt ? 0.18 : 1}
        stroke={rebuilt ? BASE_FILL[base] : NAVY}
        strokeOpacity={rebuilt ? 1 : 0.14}
      />
      <text x={x + 9.5} y={y + 15.5} textAnchor="middle" fontFamily={MONO} fontSize={12} fontWeight={700} fill={BASE_INK[base]}>
        {base}
      </text>
    </>
  );
}

function ServerScene() {
  return (
    <>
      {/* A laptop logs in to the server by its address, typed out under a shrinking cover. */}
      <g className={styles.fadeIn}>
        <rect x={10} y={30} width={124} height={80} rx={8} fill={NIGHT} stroke={NAVY} strokeWidth={3} />
        <path d="M2 114h140l-6 8H8Z" fill={NAVY} />
        <text x={18} y={57} fontFamily={MONO} fontSize={11} fill="#ffffff">
          <tspan fill={BRAND.teal}>$</tspan> ssh {JOURNEY_HPC_ADDRESS}
        </text>
        <rect x={30} y={44} width={100} height={17} fill={NIGHT} className={styles.wipe} style={d(300)} />
        <text x={18} y={80} fontFamily={MONO} fontSize={11} fontWeight={700} fill={BRAND.teal} className={styles.fadeIn} style={d(1300)}>
          connected
        </text>
      </g>
      <text x={72} y={140} textAnchor="middle" fontSize={12} fontWeight={600} fill={MUTED}>
        Our laptop
      </text>
      <path d="M72 148V176" stroke={BRAND.teal} strokeWidth={3} pathLength={1} className={styles.draw} style={d(1100)} />
      {/* What the laptop typed, named for visitors who don't read terminals. */}
      <g className={styles.fadeIn} style={d(1300)}>
        <rect x={84} y={152} width={80} height={20} rx={10} fill={BRAND.teal} fillOpacity={0.15} />
        <text x={124} y={166} textAnchor="middle" fontSize={11} fontWeight={700} fill={BRAND.tealInk}>
          IP address
        </text>
      </g>
      <g transform="translate(27 176)" className={styles.fadeIn} style={d(500)}>
        <rect x={4} y={4} width={82} height={110} rx={10} fill="#ffffff" stroke={NAVY} strokeWidth={3} />
        {[0, 1, 2].map((unit) => (
          <g key={unit}>
            <rect x={14} y={16 + unit * 32} width={62} height={24} rx={4} fill="#f7f6fa" stroke={NAVY} strokeWidth={2} />
            <circle cx={24} cy={28 + unit * 32} r={3.5} fill={BRAND.teal} className={styles.ledBlink} style={d(unit * 300)} />
            <path d={`M38 ${24 + unit * 32}H66M38 ${32 + unit * 32}H66`} stroke={NAVY} strokeWidth={1.6} strokeOpacity={0.35} />
          </g>
        ))}
      </g>
      <text x={72} y={312} textAnchor="middle" fontSize={13} fontWeight={800} fill={NAVY}>
        HPC server
      </text>
      <path d="M120 200H142M135 193l7 7-7 7" stroke={MUTED} strokeWidth={2.5} />
      <text x={150} y={66} fontSize={11} fontWeight={700} letterSpacing={1.6} fill={MUTED}>
        OVERLAPPING READS
      </text>
      {READS.map(([start, length], row) => (
        <g key={start} className={styles.slideLeft} style={d(1500 + row * 140)}>
          {bases(CONSENSUS.slice(start, start + length)).map((base, i) => (
            <BaseCell key={i} base={base} x={150 + (start + i) * PITCH} y={78 + row * 27} />
          ))}
        </g>
      ))}
      <text x={150} y={236} fontSize={11} fontWeight={700} letterSpacing={1.6} fill={BRAND.tealInk}>
        REBUILT SEQUENCE
      </text>
      {bases(CONSENSUS).map((base, i) => (
        <g key={i} className={styles.pop} style={d(2300 + i * 40)}>
          <BaseCell base={base} x={150 + i * PITCH} y={246} rebuilt />
        </g>
      ))}
    </>
  );
}

// --- Results: where the sample sits on a tree, and the report --------------------

const TIPS = [
  { y: 30, label: "Reference A" },
  { y: 80, label: "Reference B" },
  { y: 130, label: "Your sample", yours: true },
  { y: 180, label: "Reference C" },
  { y: 230, label: "Reference D" },
];
const REPORT_ITEMS = ["Identity", "Quality checks", "Tree and figures"];

function ResultsScene() {
  return (
    <>
      <g transform="translate(16 40)">
        <path
          d="M10 124H30M30 55V192M30 55H110M110 30V80M110 30H230M110 80H230M30 192H100M100 155V230M100 230H230M100 155H180M180 130V180M180 130H230M180 180H230"
          stroke={NAVY}
          strokeWidth={2.5}
          pathLength={1}
          className={styles.draw}
        />
        {/* The path from the root to the sample, traced in teal. */}
        <path d="M10 124H30V192H100V155H180V130H230" stroke={BRAND.teal} strokeWidth={4.5} pathLength={1} className={styles.draw} style={d(900)} />
        {TIPS.map((tip, i) => (
          <g key={tip.label}>
            {tip.yours && <circle cx={230} cy={tip.y} r={10} stroke={BRAND.teal} strokeWidth={2} className={styles.pulse} />}
            <circle
              cx={230}
              cy={tip.y}
              r={tip.yours ? 6.5 : 5}
              fill={tip.yours ? BRAND.teal : NAVY}
              className={styles.pop}
              style={d(tip.yours ? 1500 : 700 + i * 60)}
            />
            <text
              x={244}
              y={tip.y + 4}
              fontSize={13}
              fontWeight={tip.yours ? 800 : 600}
              fill={tip.yours ? BRAND.tealInk : MUTED}
              className={styles.fadeIn}
              style={d(tip.yours ? 1500 : 800)}
            >
              {tip.label}
            </text>
          </g>
        ))}
      </g>
      <g transform="translate(360 100)" className={styles.fadeIn} style={d(1600)}>
        <rect width={180} height={150} rx={14} fill="#ffffff" stroke={NAVY} strokeOpacity={0.12} />
        <text x={16} y={30} fontSize={15} fontWeight={800} fill={NAVY}>
          Report
        </text>
        <rect x={118} y={15} width={46} height={22} rx={11} fill={BRAND.teal} fillOpacity={0.15} />
        <text x={141} y={30} textAnchor="middle" fontSize={11} fontWeight={700} fill={BRAND.tealInk}>
          Ready
        </text>
        {REPORT_ITEMS.map((item, i) => (
          <g key={item}>
            <path d={`M16 ${58 + i * 30}l3.5 3.5 6.5-7.5`} stroke={BRAND.tealInk} strokeWidth={2} />
            <text x={36} y={63 + i * 30} fontSize={13} fill="#333333">
              {item}
            </text>
          </g>
        ))}
      </g>
    </>
  );
}

function SceneArt({ id, running }: { id: JourneyStepId; running: boolean }) {
  switch (id) {
    case "sample":
      return <SampleScene />;
    case "sequencer":
      return <SequencerScene running={running} />;
    case "storage":
      return <StorageScene />;
    case "server":
      return <ServerScene />;
    case "results":
      return <ResultsScene />;
  }
}

// --- The stage ------------------------------------------------------------------

export function SampleJourney({
  audience,
  active,
  step,
  onStepChange,
  serverSpecs,
  storageSpecs = null,
}: {
  audience: Audience;
  /** Whether this slide is the one on screen. Scenes only play then, from the first each time. */
  active: boolean;
  /** The scene the presenter has stepped to, or null to play the scenes on a timer. */
  step: number | null;
  onStepChange: (step: number) => void;
  /** The HPC server's specs, shown under the server step. */
  serverSpecs: string | null;
  /** The storage server's capacity, shown under the storage step. */
  storageSpecs?: string | null;
}) {
  // `run` counts each timed showing of a scene; `held` is set once the visitor picks a step themselves.
  const [auto, setAuto] = useState({ scene: 0, run: 0, held: false });
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setAuto((a) => ({ scene: 0, run: a.run + 1, held: false }));
  }

  const playing = step === null && active && !auto.held;
  useEffect(() => {
    if (!playing || prefersReducedMotion()) return;
    const timer = window.setTimeout(
      () => setAuto((a) => ({ ...a, scene: (a.scene + 1) % JOURNEY_STEPS.length, run: a.run + 1 })),
      JOURNEY_SCENE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, auto.run]);

  const scene = step === null ? auto.scene : Math.max(0, Math.min(JOURNEY_STEPS.length - 1, step));
  const shown = JOURNEY_STEPS[scene]!;
  const select = (index: number) => {
    if (step === null) setAuto((a) => ({ scene: index, run: a.run + 1, held: true }));
    else onStepChange(index);
  };
  const notes: Partial<Record<JourneyStepId, string | null>> = {
    sequencer: JOURNEY_SEQUENCERS,
    storage: storageSpecs,
    server: serverSpecs,
  };
  // Visual lets the scenes tell it: a wider stage and no step description.
  const visual = audience === "visual";

  return (
    <div className={`${CARD} p-4 sm:p-6`}>
      <div
        className={`grid items-center gap-6 md:gap-10 ${visual ? "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"}`}
      >
        <div className="overflow-hidden rounded-2xl bg-[#f0e8f2]">
          {/* Remounted per scene, so each one's entrance plays when it comes up. */}
          <svg
            key={shown.id}
            viewBox="0 0 560 340"
            className="block h-auto w-full"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <SceneArt id={shown.id} running={active} />
          </svg>
        </div>
        {/* All four captions share one cell, so the card keeps the height of the longest. */}
        <div className="grid">
          {JOURNEY_STEPS.map((item, i) => {
            const note = notes[item.id];
            return (
              <div
                // A new key when shown, so the caption's entrance replays.
                key={`${item.id}-${i === scene}`}
                className={`col-start-1 row-start-1 flex flex-col gap-3 self-start md:self-center ${i === scene ? "" : "invisible"}`}
              >
                <p className={`font-quicksand text-xs font-bold uppercase tracking-[0.18em] text-[#0a7558] ${styles.enter}`}>
                  Step {i + 1} of {JOURNEY_STEPS.length}
                </p>
                <h3 className={`text-3xl font-black tracking-tight text-[#2b3278] md:text-4xl ${styles.enter}`} style={d(80)}>
                  {item.name}
                </h3>
                {!visual && (
                  <p className={`text-lg leading-relaxed text-[#5b6770] ${styles.enter}`} style={d(160)}>
                    <TourCopy text={item.text} audience={audience} />
                  </p>
                )}
                <div className={`self-start rounded-xl bg-[#f7f6fa] px-3.5 py-2.5 ${styles.enter}`} style={d(260)}>
                  <p className="font-quicksand text-[11px] font-bold uppercase tracking-[0.14em] text-[#0a7558]">What we have now</p>
                  <p className="mt-0.5 font-bold text-[#2b3278]"><TourCopy text={item.now} audience={audience} /></p>
                  {note && <p className="mt-0.5 text-xs text-[#5b6770]">{note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Five names to a row on a phone: tight gaps, and a long name hyphenates on the narrowest screens. */}
      <ol className="mt-5 grid gap-1 sm:gap-4" style={{ gridTemplateColumns: `repeat(${JOURNEY_STEPS.length}, minmax(0, 1fr))` }}>
        {JOURNEY_STEPS.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              aria-label={`Step ${i + 1}: ${item.name}`}
              aria-current={i === scene ? "step" : undefined}
              onClick={() => select(i)}
              className="flex w-full cursor-pointer flex-col gap-2 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2a7797]"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`hidden h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold sm:flex ${
                    i < scene
                      ? "border-[#2b3278] bg-[#2b3278] text-white"
                      : i === scene
                        ? "border-[#12ca99] bg-[#12ca99] text-[#1c2152]"
                        : "border-[#2b3278]/20 bg-white text-[#2b3278]"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`hyphens-auto text-[11px] font-bold sm:text-sm ${i <= scene ? "text-[#2b3278]" : "text-[#5b6770]"}`}>{item.name}</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-[#2b3278]/10">
                <span
                  // Restarts with every timed showing.
                  key={i === scene ? auto.run : "idle"}
                  className={`block h-full rounded-full bg-[#12ca99] ${i > scene ? "scale-x-0" : ""} ${
                    i === scene && playing ? styles.stepFill : ""
                  }`}
                  style={{ "--t": `${JOURNEY_SCENE_MS}ms` } as CSSProperties}
                />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
