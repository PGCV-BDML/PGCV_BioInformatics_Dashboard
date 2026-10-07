"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { AUDIENCE_LABELS, AUDIENCES, type Audience, type TourContent } from "@/lib/tour";
import type { TourCovidStats } from "@/lib/tour-stats";
import type { TourPhyloSummary } from "@/lib/tour-phylo";
import {
  ContactSection,
  CovidSection,
  HeroSection,
  InfrastructureSection,
  ProjectsSection,
  ServicesSection,
  TeamSection,
  TrainingsSection,
  VariantTreeSection,
  VideosSection,
} from "./tour-sections";
import { HelixProgress } from "./helix-progress";
import { rewindReveal, watchReveal, type RevealState } from "./use-reveal";
import { useSlideFit } from "./slide-fit";
import styles from "./tour-motion.module.css";

type SectionId =
  | "welcome"
  | "services"
  | "infrastructure"
  | "trainings"
  | "projects"
  | "covid-19"
  | "variant-tree"
  | "team"
  | "videos"
  | "contact";

const NAV_LABELS: Record<SectionId, string> = {
  welcome: "Welcome",
  services: "Services",
  infrastructure: "Infrastructure",
  trainings: "Trainings",
  projects: "Projects",
  "covid-19": "COVID-19",
  "variant-tree": "Variant tree",
  team: "Team",
  videos: "Videos",
  contact: "Contact",
};

/** How long each slide stays up when auto-advance is on. */
const AUTO_ADVANCE_MS = 20_000;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Plain light sections; a light section right after another gets a divider rule. */
const LIGHT_SECTIONS = new Set<SectionId>(["services", "trainings", "projects", "variant-tree", "team", "videos"]);

export function TourExperience({
  content,
  stats,
  phylo = null,
}: {
  content: TourContent;
  stats: TourCovidStats | null;
  phylo?: TourPhyloSummary | null;
}) {
  const [audience, setAudience] = useState<Audience>("general");
  const [presenting, setPresenting] = useState(false);
  const [current, setCurrent] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  // Entrance state per section; one not listed yet is "pending". The opening
  // slide starts "visible" so it plays straight from the server HTML.
  const [reveal, setReveal] = useState<ReadonlyMap<number, RevealState>>(() => new Map([[0, "visible"]]));
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const headerRef = useRef<HTMLElement>(null);

  // Sections with nothing to show are skipped entirely.
  const sectionIds = useMemo(() => {
    const ids: SectionId[] = ["welcome", "services", "infrastructure"];
    if (content.trainings.items.length) ids.push("trainings");
    if (content.projects.items.length) ids.push("projects");
    ids.push("covid-19");
    if (content.nextstrain && phylo) ids.push("variant-tree");
    if (content.team.members.length) ids.push("team");
    if (content.videos.items.length) ids.push("videos");
    ids.push("contact");
    return ids;
  }, [content, phylo]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(sectionIds.length - 1, index));
      setCurrent(clamped);
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

  // In Present mode each slide shrinks, if needed, to fit the screen.
  useSlideFit(presenting, sectionRefs, headerRef, sectionIds);

  // In Present mode each slide snaps to the top; the sections' scroll-mt-16
  // keeps them clear of the sticky header.
  useEffect(() => {
    if (!presenting) return;
    const html = document.documentElement;
    html.style.scrollSnapType = "y proximity";
    return () => {
      html.style.scrollSnapType = "";
    };
  }, [presenting]);

  // Auto-advance for a lobby screen: next slide every 20s, back to the start
  // after the last. Any slide change restarts the clock. A video someone is
  // watching (focus inside its iframe) or a hidden tab holds the slide.
  useEffect(() => {
    if (!presenting || !autoAdvance) return;
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        if (document.hidden || document.activeElement?.matches("iframe, video")) arm();
        else goTo(current + 1 >= sectionIds.length ? 0 : current + 1);
      }, AUTO_ADVANCE_MS);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [presenting, autoAdvance, current, goTo, sectionIds.length]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, iframe, video")) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goTo(current + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(current - 1);
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
  }, [presenting, current, goTo, sectionIds.length, stopPresenting]);

  const renderSection = (id: SectionId, index: number) => {
    const props = { content, audience, index };
    switch (id) {
      case "welcome":
        return <HeroSection content={content} audience={audience} />;
      case "services":
        return <ServicesSection {...props} />;
      case "infrastructure":
        return <InfrastructureSection {...props} />;
      case "trainings":
        return <TrainingsSection {...props} />;
      case "projects":
        return <ProjectsSection {...props} />;
      case "covid-19":
        return <CovidSection {...props} stats={stats} />;
      case "variant-tree":
        return phylo ? <VariantTreeSection {...props} summary={phylo} /> : null;
      case "team":
        return <TeamSection {...props} />;
      case "videos":
        return <VideosSection {...props} />;
      case "contact":
        return <ContactSection {...props} />;
    }
  };

  return (
    <div
      data-presenting={presenting || undefined}
      className={`group/tour min-h-screen bg-[#f7f6fa] font-aileron text-[#333333] ${presenting ? "text-[1.08rem]" : ""}`}
    >
      <header ref={headerRef} className="sticky top-0 z-30 border-b-[3px] border-[#12ca99] bg-white/95 shadow-sm backdrop-blur">
        {/* Wider while presenting so the nav and "Exit presentation" fit on one line. */}
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-8 ${presenting ? "2xl:max-w-7xl" : ""}`}
        >
          <a href="#welcome" className="flex shrink-0 items-center gap-3" onClick={(e) => { e.preventDefault(); goTo(0); }}>
            <Image
              src="/assets/pgcv_logo.png"
              alt="Philippine Genome Center Visayas Logo"
              width={1440}
              height={611}
              priority
              className="h-10 w-auto shrink-0 md:h-12"
            />
            <span className="hidden border-l border-[#2b3278]/15 pl-3 font-quicksand text-[10px] font-bold uppercase leading-tight tracking-[0.12em] whitespace-nowrap text-[#2b3278] sm:block xl:hidden">
              Bioinformatics &amp;
              <br />
              Data Management Lab
            </span>
          </a>

          <nav aria-label="Tour sections" className={presenting ? "hidden 2xl:block" : "hidden xl:block"}>
            <ul className="flex gap-4 whitespace-nowrap text-sm font-semibold text-[#5b6770] 2xl:gap-5">
              {sectionIds.slice(1).map((id, i) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => { e.preventDefault(); goTo(i + 1); }}
                    className={`border-b-2 py-1 transition-colors hover:text-[#2b3278] ${
                      current === i + 1 ? "border-[#12ca99] text-[#2b3278]" : "border-transparent"
                    }`}
                  >
                    {NAV_LABELS[id]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <div
              role="radiogroup"
              aria-label="Who is visiting today?"
              className="flex rounded-full border border-[#2b3278]/15 bg-white p-1"
            >
              {AUDIENCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={audience === option}
                  onClick={() => setAudience(option)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                    audience === option ? "bg-[#2b3278] text-white" : "text-[#2b3278] hover:bg-[#f0e8f2]"
                  }`}
                >
                  {AUDIENCE_LABELS[option]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={presenting ? stopPresenting : startPresenting}
              className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-[#2a7797] px-4 py-2 text-sm font-semibold text-white transition-shadow hover:bg-[#236681] hover:shadow-[0_0_20px_rgba(18,202,153,0.35)] md:inline-flex"
            >
              {presenting ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              {presenting ? "Exit presentation" : "Present"}
            </button>
          </div>
        </div>
      </header>

      <main>
        {sectionIds.map((id, index) => (
          <section
            key={id}
            id={id}
            aria-label={NAV_LABELS[id]}
            data-tone={LIGHT_SECTIONS.has(id) ? "light" : undefined}
            // The opening slide plays straight from the server HTML, without waiting for hydration.
            data-reveal={reveal.get(index) ?? "pending"}
            ref={(el) => {
              sectionRefs.current[index] = el;
            }}
            className={`scroll-mt-16 ${
              presenting
                ? "flex min-h-[calc(100vh-4rem)] snap-start flex-col [&>div]:flex [&>div]:w-full [&>div]:flex-1 [&>div]:flex-col [&>div]:justify-center"
                : ""
            }`}
          >
            {renderSection(id, index)}
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
          <div className="relative flex items-center gap-3 overflow-hidden rounded-full bg-[#1c2152]/85 py-1.5 pl-4 pr-1.5 text-white shadow-lg backdrop-blur">
            <HelixProgress labels={sectionIds.map((id) => NAV_LABELS[id])} current={current} onSelect={goTo} />
            <span className="hidden text-xs text-white/70 lg:inline">← → to navigate · Esc to exit</span>
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
            {autoAdvance && (
              <span
                // Restarts with every slide change.
                key={current}
                className={`${styles.countdown} absolute inset-x-0 bottom-0 h-0.5 bg-[#12ca99]`}
                style={{ "--t": `${AUTO_ADVANCE_MS}ms` } as React.CSSProperties}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
