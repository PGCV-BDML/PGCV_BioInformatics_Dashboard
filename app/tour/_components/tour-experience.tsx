"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { AUDIENCE_LABELS, AUDIENCES, type Audience, type TourContent } from "@/lib/tour";
import type { TourCovidStats } from "@/lib/tour-stats";
import {
  ContactSection,
  CovidSection,
  HeroSection,
  InfrastructureSection,
  ServicesSection,
  TeamSection,
  TrainingsSection,
  VideosSection,
} from "./tour-sections";

type SectionId =
  | "welcome"
  | "services"
  | "infrastructure"
  | "trainings"
  | "covid-19"
  | "team"
  | "videos"
  | "contact";

const NAV_LABELS: Record<SectionId, string> = {
  welcome: "Welcome",
  services: "Services",
  infrastructure: "Infrastructure",
  trainings: "Trainings",
  "covid-19": "COVID-19",
  team: "Team",
  videos: "Videos",
  contact: "Contact",
};

export function TourExperience({
  content,
  stats,
}: {
  content: TourContent;
  stats: TourCovidStats | null;
}) {
  const [audience, setAudience] = useState<Audience>("general");
  const [presenting, setPresenting] = useState(false);
  const [current, setCurrent] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Sections with nothing to show are skipped entirely.
  const sectionIds = useMemo(() => {
    const ids: SectionId[] = ["welcome", "services", "infrastructure"];
    if (content.trainings.items.length) ids.push("trainings");
    ids.push("covid-19");
    if (content.team.members.length) ids.push("team");
    if (content.videos.items.length) ids.push("videos");
    ids.push("contact");
    return ids;
  }, [content]);

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
      case "covid-19":
        return <CovidSection {...props} stats={stats} />;
      case "team":
        return <TeamSection {...props} />;
      case "videos":
        return <VideosSection {...props} />;
      case "contact":
        return <ContactSection {...props} />;
    }
  };

  return (
    <div className={`min-h-screen bg-[#f4f4f4] text-[#333333] ${presenting ? "text-[1.08rem]" : ""}`}>
      <header className="sticky top-0 z-30 border-b border-[#4e2a74]/10 bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <a href="#welcome" className="flex items-center gap-3" onClick={(e) => { e.preventDefault(); goTo(0); }}>
            <span
              className="h-9 w-9 shrink-0 rounded-full bg-[linear-gradient(90deg,#f08a2c,#7b2d8e,#2a6db0)]"
              aria-hidden="true"
            />
            <span className="leading-tight">
              <span className="block font-bold text-[#4e2a74]">PGC Visayas</span>
              <span className="hidden font-quicksand text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a8e9b] sm:block">
                Bioinformatics &amp; Data Management Lab
              </span>
            </span>
          </a>

          <nav aria-label="Tour sections" className="hidden xl:block">
            <ul className="flex gap-5 whitespace-nowrap text-sm font-medium text-[#4b5b63]">
              {sectionIds.slice(1).map((id, i) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => { e.preventDefault(); goTo(i + 1); }}
                    className={`hover:text-[#4e2a74] ${current === i + 1 ? "font-semibold text-[#4e2a74]" : ""}`}
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
              className="flex rounded-full border border-[#4e2a74]/20 bg-white p-1"
            >
              {AUDIENCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={audience === option}
                  onClick={() => setAudience(option)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                    audience === option ? "bg-[#4e2a74] text-white" : "text-[#4e2a74] hover:bg-[#f3edf9]"
                  }`}
                >
                  {AUDIENCE_LABELS[option]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={presenting ? stopPresenting : startPresenting}
              className="hidden items-center gap-2 rounded-full bg-[#4e2a74] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d2060] md:inline-flex"
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

      <footer className="bg-[#22143a] px-4 py-6 text-sm text-[#b9a8cf] md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
          <span>Philippine Genome Center Visayas · University of the Philippines Visayas</span>
          <span>Summary statistics only — no client or patient data is shown.</span>
        </div>
      </footer>

      {presenting && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex items-center justify-center gap-4" aria-hidden="true">
          <div className="flex items-center gap-2 rounded-full bg-[#22143a]/85 px-4 py-2 backdrop-blur">
            {sectionIds.map((id, i) => (
              <span
                key={id}
                className={`h-2.5 rounded-full transition-all ${i === current ? "w-8 bg-[#6ff2c4]" : "w-2.5 bg-white/30"}`}
              />
            ))}
            <span className="ml-3 text-xs text-[#b9a8cf]">← → to navigate · Esc to exit</span>
          </div>
        </div>
      )}
    </div>
  );
}
