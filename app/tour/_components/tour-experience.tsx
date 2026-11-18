"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageIcon, Maximize2, Music, Pause, Play, VolumeX, X } from "lucide-react";
import {
  AUDIENCE_LABELS,
  AUDIENCES,
  tourMusicUrl,
  type Audience,
  type TourContent,
  type TourProject,
} from "@/lib/tour";
import { JOURNEY_STEPS } from "@/lib/tour-journey";
import { SHOWCASE_COPY, type ShowcaseCopy } from "@/lib/tour-showcase";
import type { TourCovidStats } from "@/lib/tour-stats";
import type { TourPhyloSummary } from "@/lib/tour-phylo";
import type { TourVirusSummary } from "@/lib/tour-virus";
import { HelixProgress } from "./helix-progress";
import { JOURNEY_SCENE_MS } from "./sample-journey";
import { hasProjectJourney } from "./project-feature";
import { rewindReveal, watchReveal, type RevealState } from "./use-reveal";
import { deckScaleScript, useDeckScale } from "./deck-scale";
import { useFitCheck } from "./fit-check";
import type { SlideMeta } from "./slide-frame";
import { AgendaSlide } from "./slides/agenda-slide";
import { ContactSlide } from "./slides/contact-slide";
import { CovidSlide } from "./slides/covid-slide";
import { InfrastructureSlide } from "./slides/infrastructure-slide";
import { IntroSlide } from "./slides/intro-slide";
import { JourneySlide } from "./slides/journey-slide";
import { LabMapSlide } from "./slides/lab-map-slide";
import { ProjectJourneySlide, ProjectStorySlide } from "./slides/projects-slides";
import { ResultsSlide } from "./slides/results-slide";
import { ServicesSlide } from "./slides/services-slide";
import { TeamSlide } from "./slides/team-slide";
import { TrainingsSlide } from "./slides/trainings-slide";
import { VariantTreeSlide } from "./slides/variant-tree-slide";
import { VideosSlide } from "./slides/videos-slide";
import { VirusSlide } from "./slides/virus-slide";
import { WelcomeSlide } from "./slides/welcome-slide";
import slideStyles from "./slide.module.css";
import styles from "./tour-motion.module.css";

/** What a slide shows. Sample results and each project take more than one slide. */
type SlideSpec =
  | { kind: "welcome" | "intro" | "journey" | "services" | "trainings" | "lab-map" | "infrastructure" }
  | { kind: "covid" | "variant-tree" | "virus" | "agenda" | "team" | "videos" | "contact" }
  | { kind: "results"; item: ShowcaseCopy }
  | { kind: "project" | "project-journey"; project: TourProject };

/** A slide: its anchor (…/tour#services), its name in the progress bar, and what it shows. */
type SlideEntry = { id: string; nav: string; spec: SlideSpec };

/** The tour's slides, in order. Slides with nothing to show are left out. */
export function tourSlides(
  content: TourContent,
  { phylo, virus, labMap }: { phylo: boolean; virus: boolean; labMap: boolean },
): SlideEntry[] {
  const slides: SlideEntry[] = [
    { id: "welcome", nav: "Welcome", spec: { kind: "welcome" } },
    { id: "intro", nav: "Bioinformatics", spec: { kind: "intro" } },
    { id: "sample-to-sequence", nav: "Sample to sequence", spec: { kind: "journey" } },
    { id: "services", nav: "Services", spec: { kind: "services" } },
    // One slide per service's results, as in the deck.
    ...SHOWCASE_COPY.map((item) => ({ id: `results-${item.id}`, nav: `Results: ${item.service}`, spec: { kind: "results" as const, item } })),
  ];
  // Training is the one service the sample results can't show, so it follows them.
  if (content.trainings.items.length) slides.push({ id: "trainings", nav: "Trainings", spec: { kind: "trainings" } });
  if (content.labMap && labMap) slides.push({ id: "lab-map", nav: "Lab map", spec: { kind: "lab-map" } });
  slides.push({ id: "infrastructure", nav: "Infrastructure", spec: { kind: "infrastructure" } });
  // Each project: its story, then (when it has one) its journey from sample to genome.
  content.projects.items.forEach((project, i) => {
    const id = i === 0 ? "projects" : `project-${project.id}`;
    const name = project.commonName ?? project.species ?? project.title;
    slides.push({ id, nav: i === 0 ? "Projects" : name, spec: { kind: "project", project } });
    if (hasProjectJourney(project)) {
      slides.push({
        id: i === 0 ? "projects-genome" : `${id}-genome`,
        nav: i === 0 ? "Sample to genome" : `${name}: sample to genome`,
        spec: { kind: "project-journey", project },
      });
    }
  });
  slides.push({ id: "covid-19", nav: "COVID-19", spec: { kind: "covid" } });
  if (content.nextstrain && phylo) slides.push({ id: "variant-tree", nav: "Variant tree", spec: { kind: "variant-tree" } });
  if (content.virusModel && virus) slides.push({ id: "virus-model", nav: "3D virus", spec: { kind: "virus" } });
  slides.push({ id: "agenda", nav: "Research agenda", spec: { kind: "agenda" } });
  if (content.team.members.length) slides.push({ id: "team", nav: "Team", spec: { kind: "team" } });
  if (content.videos.items.length) slides.push({ id: "videos", nav: "Videos", spec: { kind: "videos" } });
  slides.push({ id: "contact", nav: "Contact", spec: { kind: "contact" } });
  return slides;
}

/**
 * Runs as the page is parsed (it sets the slides' scale before the first
 * paint); React leaves it alone afterwards, so on the client it is inert text.
 */
function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const TOUR_MAIN_ID = "tour-main";

/** How long the mouse stays still before the Present-mode controls fade. */
const CONTROLS_IDLE_MS = 3000;

/** How long each slide stays up when auto-advance is on. */
const AUTO_ADVANCE_MS = 20_000;

/** Slides that stay up longer, so their scenes can all play. */
const SLIDE_MS: Partial<Record<string, number>> = {
  "sample-to-sequence": JOURNEY_STEPS.length * JOURNEY_SCENE_MS,
};

/**
 * Slides with steps of their own. In Present mode (without auto-advance) the
 * arrow keys go through a slide's steps before moving to the next slide.
 */
const SLIDE_STEPS: Partial<Record<string, number>> = {
  "sample-to-sequence": JOURNEY_STEPS.length,
};

/** Background music: quiet under the presenter, quieter still on the Videos slide. */
const MUSIC_VOLUME = 0.25;
const MUSIC_DUCKED_VOLUME = 0.04;
const MUSIC_STORAGE_KEY = "pgcv-tour-music";

const fades = new WeakMap<HTMLAudioElement, () => void>();

/** Eases the volume to `target`, replacing any fade already running. */
function fadeTo(audio: HTMLAudioElement, target: number, ms: number, done?: () => void) {
  fades.get(audio)?.();
  const from = audio.volume;
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    // A frame stamp can predate start, so clamp at 0 too: volume outside [0, 1] throws.
    const t = Math.min(1, Math.max(0, (now - start) / ms));
    audio.volume = from + (target - from) * t;
    if (t < 1) {
      frame = requestAnimationFrame(step);
    } else {
      fades.delete(audio);
      done?.();
    }
  };
  frame = requestAnimationFrame(step);
  fades.set(audio, () => cancelAnimationFrame(frame));
}

/** Fades the track in while `playing`, down while `ducked`, and out (then pauses) otherwise. */
function useBackgroundMusic(audioRef: React.RefObject<HTMLAudioElement | null>, playing: boolean, ducked: boolean) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().catch(() => {
          // Blocked or missing file; the presentation carries on in silence.
        });
      }
      fadeTo(audio, ducked ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME, 1200);
    } else if (!audio.paused) {
      fadeTo(audio, 0, 800, () => audio.pause());
    }
  }, [audioRef, playing, ducked]);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Who the copy is written for; shown in the header, and in the controls while presenting. */
function AudienceToggle({
  audience,
  onChange,
  onDark,
}: {
  audience: Audience;
  onChange: (audience: Audience) => void;
  onDark?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Who is visiting today?"
      className={`flex rounded-full border p-1 ${onDark ? "border-white/15 bg-white/10" : "border-[#2b3278]/15 bg-white"}`}
    >
      {AUDIENCES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={audience === option}
          onClick={() => onChange(option)}
          // Narrow on phones so four options fit beside the logo.
          className={`inline-flex items-center gap-1 rounded-full py-1 font-semibold transition-colors ${onDark ? "px-2.5 text-xs" : "px-1.5 text-[11px] sm:px-3.5 sm:text-sm"} ${
            audience === option
              ? onDark
                ? "bg-white text-[#1c2152]"
                : "bg-[#2b3278] text-white"
              : onDark
                ? "text-white/80 hover:bg-white/10"
                : "text-[#2b3278] hover:bg-[#f0e8f2]"
          }`}
        >
          {option === "visual" && <ImageIcon className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />}
          {AUDIENCE_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

export function TourExperience({
  content,
  stats,
  phylo = null,
  virus = null,
  labMap = false,
}: {
  content: TourContent;
  stats: TourCovidStats | null;
  phylo?: TourPhyloSummary | null;
  virus?: TourVirusSummary | null;
  /** Whether the lab map page loaded; the slide is hidden otherwise. */
  labMap?: boolean;
}) {
  const [audience, setAudience] = useState<Audience>("general");
  const [presenting, setPresenting] = useState(false);
  const [current, setCurrent] = useState(0);
  // The step reached on a slide with steps; any other slide is at its first.
  const [slideStep, setSlideStep] = useState({ index: 0, step: 0 });
  const [autoAdvance, setAutoAdvance] = useState(false);
  // In Present mode the controls and the cursor fade after a few still seconds, as in the decks.
  const [idle, setIdle] = useState(false);
  // Opt-in, remembered per browser. Its button only renders in Present mode,
  // never in the server HTML, so reading storage up front can't mismatch.
  const [music, setMusic] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(MUSIC_STORAGE_KEY) === "on";
    } catch {
      return false;
    }
  });
  const musicSrc = tourMusicUrl(content.music);
  const musicRef = useRef<HTMLAudioElement>(null);
  // Entrance state per section; one not listed yet is "pending". The opening
  // slide starts "visible" so it plays straight from the server HTML.
  const [reveal, setReveal] = useState<ReadonlyMap<number, RevealState>>(() => new Map([[0, "visible"]]));
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const headerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Slides with nothing to show are skipped entirely.
  const slides = useMemo(
    () => tourSlides(content, { phylo: Boolean(phylo), virus: Boolean(virus), labMap }),
    [content, phylo, virus, labMap],
  );
  const sectionIds = useMemo(() => slides.map((slide) => slide.id), [slides]);

  /** Scrolls to a slide, at its first step unless told otherwise. */
  const goTo = useCallback(
    (index: number, step = 0) => {
      const clamped = Math.max(0, Math.min(sectionIds.length - 1, index));
      setCurrent(clamped);
      setSlideStep({ index: clamped, step });
      sectionRefs.current[clamped]?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    },
    [sectionIds.length],
  );

  const stopPresenting = useCallback(() => {
    setPresenting(false);
    setAutoAdvance(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const startPresenting = () => {
    setPresenting(true);
    setIdle(false);
    // Visual is for a screen nobody presents from, so it plays by itself.
    setAutoAdvance(audience === "visual");
    document.documentElement.requestFullscreen?.().catch(() => {
      // Fullscreen refused (iframe, iOS) — presentation layout still applies.
    });
  };

  // Track which section is on screen so arrow keys continue from there.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.indexOf(entry.target as HTMLElement);
            if (index >= 0) setCurrent(index);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const el of sectionRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [sectionIds]);

  // Play each section's entrance whenever it scrolls into view, and rewind it
  // once it has left the screen, so going back to a slide replays it.
  useEffect(() => {
    const set = (index: number, state: RevealState) =>
      setReveal((prev) => (prev.get(index) === state ? prev : new Map(prev).set(index, state)));
    const cleanups = sectionRefs.current.flatMap((el, index) => {
      if (!el) return [];
      let cancel = () => {};
      const stop = watchReveal(
        el,
        () => {
          cancel();
          set(index, "visible");
        },
        () => {
          cancel = rewindReveal(
            () => set(index, "reset"),
            () => set(index, "pending"),
          );
        },
        "-15%",
      );
      return [() => (stop(), cancel())];
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [sectionIds]);

  /** Visual turns auto-advance on and the others turn it off; the button still overrides either. */
  const chooseAudience = (next: Audience) => {
    setAudience(next);
    setAutoAdvance(next === "visual");
  };

  const toggleMusic = () => {
    setMusic((on) => {
      try {
        localStorage.setItem(MUSIC_STORAGE_KEY, on ? "off" : "on");
      } catch {
        // Storage blocked; the choice lasts for this visit.
      }
      return !on;
    });
  };

  useBackgroundMusic(musicRef, presenting && music, sectionIds[current] === "videos");

  // The controls sit in the slide's bottom margin, over its footer, so they fade
  // once the mouse has been still for a while and come back when it moves.
  useEffect(() => {
    if (!presenting) return;
    let timer = window.setTimeout(() => setIdle(true), CONTROLS_IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), CONTROLS_IDLE_MS);
    };
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, [presenting]);

  // One scale for every slide: the window's on the page, the screen's in Present mode.
  useDeckScale(mainRef, headerRef, presenting);
  // A slide that runs past its margins is a content problem: named in development.
  useFitCheck(mainRef, audience, sectionIds);

  // In Present mode each slide fills the screen and snaps to it (the header is hidden then).
  useEffect(() => {
    if (!presenting) return;
    const html = document.documentElement;
    html.style.scrollSnapType = "y mandatory";
    return () => {
      html.style.scrollSnapType = "";
    };
  }, [presenting]);

  const currentSlideMs = SLIDE_MS[sectionIds[current]!] ?? AUTO_ADVANCE_MS;

  // Auto-advance for a lobby screen: next slide every 20s (longer for slides
  // in SLIDE_MS), back to the start after the last. Any slide change restarts
  // the clock. A video someone is watching (focus inside its iframe) or a
  // hidden tab holds the slide.
  useEffect(() => {
    if (!presenting || !autoAdvance) return;
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        if (document.hidden || document.activeElement?.matches("iframe, video")) arm();
        else goTo(current + 1 >= sectionIds.length ? 0 : current + 1);
      }, currentSlideMs);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [presenting, autoAdvance, current, currentSlideMs, goTo, sectionIds.length]);

  useEffect(() => {
    if (!presenting) return;
    // Auto-advance plays a slide's steps on their own, so then the keys move whole slides.
    const lastStep = (index: number) => {
      const id = sectionIds[index];
      return autoAdvance || !id ? 0 : (SLIDE_STEPS[id] ?? 1) - 1;
    };
    const step = slideStep.index === current ? slideStep.step : 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, iframe, video")) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        if (step < lastStep(current)) setSlideStep({ index: current, step: step + 1 });
        else goTo(current + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        // Going back lands on the previous slide's last step, as if it had just been played.
        if (step > 0 && !autoAdvance) setSlideStep({ index: current, step: step - 1 });
        else goTo(current - 1, lastStep(current - 1));
      } else if (event.key === "Home") {
        goTo(0);
      } else if (event.key === "End") {
        goTo(sectionIds.length - 1);
      } else if (event.key === "Escape") {
        stopPresenting();
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [presenting, autoAdvance, current, slideStep, goTo, sectionIds, stopPresenting]);

  const renderSlide = ({ id, spec }: SlideEntry, index: number): ReactNode => {
    const meta: SlideMeta = { number: index + 1, total: slides.length };
    const props = { content, audience, meta };
    switch (spec.kind) {
      case "welcome":
        return <WelcomeSlide content={content} audience={audience} />;
      case "intro":
        return <IntroSlide audience={audience} meta={meta} />;
      case "journey":
        return (
          <JourneySlide
            {...props}
            active={current === index}
            // Stepped by the arrow keys while presenting; otherwise its scenes play on a timer.
            step={presenting && !autoAdvance ? (slideStep.index === index ? slideStep.step : 0) : null}
            onStepChange={(step) => setSlideStep({ index, step })}
          />
        );
      case "services":
        return <ServicesSlide {...props} />;
      case "results":
        return <ResultsSlide item={spec.item} audience={audience} meta={meta} />;
      case "trainings":
        return <TrainingsSlide {...props} />;
      case "lab-map":
        return <LabMapSlide {...props} holdPageScroll={presenting && current === index} />;
      case "infrastructure":
        return <InfrastructureSlide {...props} />;
      case "project":
        return <ProjectStorySlide project={spec.project} heading={content.projects.title} audience={audience} meta={meta} />;
      case "project-journey":
        return <ProjectJourneySlide project={spec.project} audience={audience} meta={meta} />;
      case "covid":
        return <CovidSlide {...props} stats={stats} />;
      case "variant-tree":
        return phylo ? <VariantTreeSlide {...props} summary={phylo} /> : null;
      case "virus":
        return virus ? <VirusSlide {...props} summary={virus} /> : null;
      case "agenda":
        return <AgendaSlide audience={audience} meta={meta} />;
      case "team":
        return <TeamSlide {...props} />;
      case "videos":
        return <VideosSlide content={content} meta={meta} />;
      case "contact":
        return <ContactSlide content={content} audience={audience} />;
    }
    return id;
  };

  return (
    <div
      data-presenting={presenting || undefined}
      data-audience={audience}
      data-idle={(presenting && idle) || undefined}
      className={`group/tour min-h-screen bg-[#f7f6fa] font-aileron text-[#333333] ${presenting && idle ? "cursor-none" : ""}`}
    >
      {/* Present mode is full screen: the slides get the whole height, and the controls move to the bottom bar. */}
      <header
        ref={headerRef}
        data-tour-header
        className={`sticky top-0 z-30 border-b-[3px] ${presenting ? "hidden" : ""} border-[#12ca99] bg-white/95 shadow-sm backdrop-blur`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-8">
          <a href="#welcome" className="flex shrink-0 items-center gap-3" onClick={(e) => { e.preventDefault(); goTo(0); }}>
            <Image
              src="/assets/pgcv_logo.png"
              alt="Philippine Genome Center Visayas Logo"
              width={1440}
              height={611}
              priority
              className="h-8 w-auto shrink-0 sm:h-10 md:h-12"
            />
            <span className="hidden border-l border-[#2b3278]/15 pl-3 font-quicksand text-[10px] font-bold uppercase leading-tight tracking-[0.12em] whitespace-nowrap text-[#2b3278] sm:block">
              Bioinformatics &amp;
              <br />
              Data Management Lab
            </span>
          </a>

          <div className="flex items-center gap-2">
            {!presenting && <AudienceToggle audience={audience} onChange={chooseAudience} />}
            <button
              type="button"
              onClick={startPresenting}
              className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-[#2a7797] px-4 py-2 text-sm font-semibold text-white transition-shadow hover:bg-[#236681] hover:shadow-[0_0_20px_rgba(18,202,153,0.35)] md:inline-flex"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              Present
            </button>
          </div>
        </div>
      </header>

      {/*
        Every slide is laid out at 1280 x 720 and scaled by one factor for the
        whole tour (--s, set before the first paint by the script, then kept up
        by useDeckScale). Below 768px the slides stack instead.
      */}
      <main id={TOUR_MAIN_ID} ref={mainRef} className={slideStyles.deck} suppressHydrationWarning>
        <InlineScript html={deckScaleScript(TOUR_MAIN_ID, "[data-tour-header]")} />
        {slides.map((slide, index) => (
          <section
            key={slide.id}
            id={slide.id}
            aria-label={slide.nav}
            // The opening slide plays straight from the server HTML, without waiting for hydration.
            data-reveal={reveal.get(index) ?? "pending"}
            ref={(el) => {
              sectionRefs.current[index] = el;
            }}
            className={slideStyles.section}
          >
            <div className={slideStyles.canvas}>{renderSlide(slide, index)}</div>
          </section>
        ))}
      </main>

      <footer className="bg-[#1c2152] px-4 py-8 text-sm text-white/70 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-white px-3 py-2">
              <Image
                src="/assets/pgcv_logo.png"
                alt="Philippine Genome Center Visayas Logo"
                width={1440}
                height={611}
                className="h-8 w-auto"
              />
            </span>
            <span className="leading-relaxed">
              <span className="block font-semibold text-white">
                University of the Philippines – Philippine Genome Center Visayas
              </span>
              Bioinformatics and Data Management Laboratory · @PGCVisayas
            </span>
          </div>
          <span>No client or patient information is shown.</span>
        </div>
      </footer>

      {presenting && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div
            className={`relative flex items-center gap-3 overflow-hidden rounded-full bg-[#1c2152]/85 py-1.5 pl-4 pr-1.5 text-white shadow-lg backdrop-blur transition-opacity duration-500 ${
              idle ? "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100" : ""
            }`}
          >
            <HelixProgress labels={slides.map((slide) => slide.nav)} current={current} onSelect={goTo} />
            <span className="hidden text-xs text-white/70 2xl:inline">← → to navigate · Esc to exit</span>
            <AudienceToggle audience={audience} onChange={chooseAudience} onDark />
            {musicSrc && (
              <button
                type="button"
                aria-pressed={music}
                onClick={toggleMusic}
                title={music ? "Turn the background music off" : "Play background music"}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  music ? "bg-[#12ca99] text-[#1c2152]" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {music ? <Music className="h-3.5 w-3.5" aria-hidden="true" /> : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
                Music
              </button>
            )}
            <button
              type="button"
              aria-pressed={autoAdvance}
              onClick={() => setAutoAdvance((on) => !on)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                autoAdvance ? "bg-[#12ca99] text-[#1c2152]" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {autoAdvance ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              Auto-advance
            </button>
            <button
              type="button"
              onClick={stopPresenting}
              aria-label="Exit presentation"
              title="Exit presentation (Esc)"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {autoAdvance && (
              <span
                // Restarts with every slide change.
                key={current}
                className={`${styles.countdown} absolute inset-x-0 bottom-0 h-0.5 bg-[#12ca99]`}
                style={{ "--t": `${currentSlideMs}ms` } as React.CSSProperties}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}
      {/* Loaded only once the music is first turned on. */}
      {musicSrc && <audio ref={musicRef} src={musicSrc} loop preload="none" />}
    </div>
  );
}
