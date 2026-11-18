import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Pause, Play, RotateCw } from "lucide-react";
import { formatMonth } from "@/lib/tour-phylo";
import type { TourVirusSummary } from "@/lib/tour-virus";
import type { VirusView } from "../virus-viewer";
import { CARD } from "../brand";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { delay, type SlideProps } from "./shared";

// WebGL viewer and its ~2 MB of model data load only near the slide.
const VirusViewer = dynamic(() => import("../virus-viewer").then((m) => m.VirusViewer), { ssr: false });

/** Seconds each mutation stays up while the timeline plays. */
const VIRUS_STEP_MS = 7000;

const VIRUS_VIEWS: { id: VirusView; label: string }[] = [
  { id: "virus", label: "Whole virus" },
  { id: "spike", label: "Spike detail" },
];

/** The deck's `virus`: the 3D viewer on the left, the mutations and their timeline on the right. */
export function VirusSlide({ content, audience, meta, summary }: SlideProps & { summary: TourVirusSummary }) {
  const virusModel = content.virusModel!;
  const { mutations } = summary;
  const [view, setView] = useState<VirusView>("virus");
  const [siteIndex, setSiteIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rotating, setRotating] = useState(true);
  // False when the browser has no WebGL and a still picture is shown.
  const [interactive, setInteractive] = useState(true);
  const site = siteIndex === null ? null : (mutations[siteIndex] ?? null);

  const showView = (next: VirusView) => {
    setPlaying(false);
    setView(next);
    if (next === "virus") setSiteIndex(null);
  };
  const pick = (i: number) => {
    setPlaying(false);
    setView("spike");
    setSiteIndex(i === siteIndex ? null : i);
  };
  const openSpike = useCallback(() => {
    setPlaying(false);
    setView("spike");
  }, []);
  const togglePlay = () => {
    if (playing) return setPlaying(false);
    setView("spike");
    setSiteIndex((i) => (i === null || i >= mutations.length - 1 ? 0 : i));
    setPlaying(true);
  };

  // Steps through the mutations in date order, then starts over. A hidden tab holds the step.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSiteIndex((i) => (i === null || i + 1 >= mutations.length ? 0 : i + 1));
    }, VIRUS_STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, mutations.length]);

  const first = mutations[0]?.firstMonth;
  const last = mutations.at(-1)?.firstMonth;
  const { structure } = summary;
  const siteNote = site ? [site.description, site.region].filter(Boolean).join(" · ") : "";

  return (
    <LightSlide
      meta={meta}
      eyebrow="Up close"
      title={virusModel.title}
      intro={audience !== "visual" && <TourCopy text={virusModel.intro} audience={audience} />}
      source={`Spike: PDB ${structure.id}${structure.method ? ` (${structure.method})` : ""} · orange dots mark where each change sits, not its new shape · the whole virus is a simplified drawing · counts are sequenced genomes, not cases`}
    >
      <div className="grid gap-6 canvas:h-full canvas:grid-cols-[minmax(0,1fr)_440px]">
        <figure
          className={`${styles.enter} relative h-[420px] overflow-hidden rounded-3xl border border-[#2b3278]/10 bg-[#1c2152] bg-[radial-gradient(circle_at_50%_50%,rgba(42,119,151,0.45),transparent_65%)] text-white shadow-[0_18px_40px_-16px_rgba(43,50,120,0.35)] canvas:h-full canvas:rounded-2xl`}
          style={delay(240)}
        >
          <VirusViewer
            view={view}
            site={site}
            mutations={mutations}
            spinning={rotating && !playing && !site}
            onOpenSpike={openSpike}
            onInteractiveChange={setInteractive}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4">
            <div
              role="radiogroup"
              aria-label="Choose the 3D view"
              className="pointer-events-auto flex rounded-full border border-white/15 bg-[#1c2152]/70 p-1 backdrop-blur"
            >
              {VIRUS_VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={view === option.id}
                  onClick={() => showView(option.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    view === option.id ? "bg-[#12ca99] text-[#1c2152]" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {interactive && (
              <button
                type="button"
                aria-pressed={rotating}
                onClick={() => setRotating((on) => !on)}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1c2152]/70 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/10 canvas:text-[14px]"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                {rotating ? "Stop turning" : "Turn"}
              </button>
            )}
          </div>

          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
            <span
              className={`inline-flex items-center gap-2 rounded-full bg-[#1c2152]/70 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur canvas:text-[14px] ${site ? "max-sm:hidden canvas:hidden" : ""}`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff8601]" aria-hidden="true" />
              {view === "virus" ? "Spike (S) protein · click the orange one to look closer" : "Mutation sites on the spike"}
            </span>
            {site && (
              <span
                key={site.name}
                role="status"
                className="rounded-2xl border-l-4 border-[#ff8601] bg-[#1c2152]/85 px-4 py-2.5 backdrop-blur canvas:max-w-full"
              >
                <span className="block font-quicksand text-[11px] font-bold uppercase tracking-[0.12em] text-[#12ca99] canvas:text-[14px]">
                  Spike mutation
                </span>
                <span className="block text-2xl font-black tracking-tight canvas:text-[30px] canvas:leading-tight">{site.name}</span>
                <span className="block text-sm text-white/75 canvas:text-[14px]">
                  First seen {formatMonth(site.firstMonth)} · {site.count.toLocaleString("en-PH")} genomes
                </span>
                {/* On the canvas the side panel has no room for the note, so it shows here. */}
                {siteNote && <span className="mt-1 hidden text-[14px] leading-snug text-white/80 canvas:block">{siteNote}</span>}
                {!site.chains.length && (
                  <span className="mt-1 block text-xs text-white/60 canvas:text-[14px]">Not resolved in this structure, so not marked.</span>
                )}
              </span>
            )}
          </figcaption>
        </figure>

        <aside className={`${styles.enter} ${CARD} flex flex-col rounded-3xl p-6 canvas:rounded-2xl canvas:px-[18px] canvas:py-3.5`} style={delay(320)}>
          <p className="font-quicksand text-xs font-bold uppercase tracking-[0.15em] text-[#0a7558] canvas:text-[14px]">Mutations across time</p>
          <h3 className="mt-1 text-2xl font-black text-[#2b3278] canvas:text-[20px] canvas:font-extrabold">{mutations.length} spike changes we saw</h3>
          {first && last && (
            <p className="mt-1 text-sm text-[#5b6770] canvas:mt-0 canvas:text-[14px]">
              First seen between {formatMonth(first)} and {formatMonth(last)}
            </p>
          )}
          <button
            type="button"
            aria-pressed={playing}
            onClick={togglePlay}
            className="mt-5 inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#2a7797] px-4 py-2 text-sm font-semibold text-white transition-shadow hover:bg-[#236681] hover:shadow-[0_0_20px_rgba(18,202,153,0.35)] canvas:mt-2 canvas:py-1.5 canvas:text-[14px]"
          >
            {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {playing ? "Pause timeline" : "Play timeline"}
          </button>
          <ol className="mt-5 grid grid-cols-3 gap-2 canvas:mt-2.5 canvas:grid-cols-4 canvas:gap-1.5" aria-label="Spike mutations, earliest first">
            {mutations.map((m, i) => {
              const active = i === siteIndex;
              return (
                <li key={m.name}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(i)}
                    className={`w-full rounded-xl border px-2.5 py-2 text-left transition-colors canvas:rounded-[10px] canvas:px-2 canvas:py-1 ${
                      active
                        ? "border-[#12ca99] bg-[#12ca99] text-[#1c2152]"
                        : "border-[#2b3278]/10 bg-[#f7f6fa] text-[#2b3278] hover:border-[#12ca99]/60"
                    }`}
                  >
                    <span className="block text-sm font-black tabular-nums canvas:text-[18px] canvas:leading-snug">{m.name}</span>
                    <span className={`block text-[11px] font-medium canvas:text-[14px] canvas:leading-snug ${active ? "text-[#1c2152]/75" : "text-[#5b6770]"}`}>
                      {formatMonth(m.firstMonth)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-sm leading-relaxed text-[#5b6770] canvas:hidden" aria-live="polite">
            {siteNote || "Pick a change to see where it sits on the spike, the part of the virus that grabs our cells."}
          </p>
        </aside>
      </div>
    </LightSlide>
  );
}
