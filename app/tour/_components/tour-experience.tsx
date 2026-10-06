"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Maximize2, Minimize2 } from "lucide-react";
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
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

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
      sectionRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [sectionIds.length],
  );

  const stopPresenting = useCallback(() => {
    setPresenting(false);
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
      <header className="sticky top-0 z-30 border-b-[3px] border-[#12ca99] bg-white/95 shadow-sm backdrop-blur">
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
            ref={(el) => {
              sectionRefs.current[index] = el;
            }}
            className={`scroll-mt-16 ${
              presenting
                ? "flex min-h-[calc(100vh-4rem)] flex-col [&>div]:flex [&>div]:w-full [&>div]:flex-1 [&>div]:flex-col [&>div]:justify-center"
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
        <div className="fixed inset-x-0 bottom-4 z-40 flex items-center justify-center gap-4" aria-hidden="true">
          <div className="flex items-center gap-2 rounded-full bg-[#1c2152]/85 px-4 py-2 backdrop-blur">
            {sectionIds.map((id, i) => (
              <span
                key={id}
                className={`h-2.5 rounded-full transition-all ${i === current ? "w-8 bg-[#12ca99]" : "w-2.5 bg-white/30"}`}
              />
            ))}
            <span className="ml-3 text-xs text-white/70">← → to navigate · Esc to exit</span>
          </div>
        </div>
      )}
    </div>
  );
}
