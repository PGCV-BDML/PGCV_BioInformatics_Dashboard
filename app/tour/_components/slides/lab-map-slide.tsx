import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { TOUR_LAB_MAP_URL } from "@/lib/tour";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { delay, type SlideProps } from "./shared";

/**
 * The content repo's self-contained 3D lab map, framed whole (the deck's
 * `embed`). It scrolls on its own; tour-experience leaves the arrow keys to it
 * while it has focus.
 */
export function LabMapSlide({ content, audience, meta, holdPageScroll }: SlideProps & { holdPageScroll: boolean }) {
  const labMap = content.labMap!;
  const [pointerOver, setPointerOver] = useState(false);

  // A scroll the map doesn't use up carries on to the page, and in Present mode
  // that snaps to another slide. So while presenting, the page holds still with
  // the pointer over the map; the keys and the progress bar still move it. The
  // reserved gutter stops the slide shifting sideways as the scrollbar goes.
  useEffect(() => {
    if (!holdPageScroll || !pointerOver) return;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "stable";
    return () => {
      html.style.overflow = "";
      html.style.scrollbarGutter = "";
    };
  }, [holdPageScroll, pointerOver]);

  return (
    <LightSlide
      meta={meta}
      eyebrow="Step inside"
      title={labMap.title}
      intro={audience !== "visual" && <TourCopy text={labMap.intro} audience={audience} />}
    >
      <figure
        className={`${styles.enter} relative h-[70vh] min-h-[420px] overflow-hidden rounded-3xl border border-[#2b3278]/10 bg-[#073e3e] shadow-[0_18px_40px_-16px_rgba(43,50,120,0.35)] canvas:h-full canvas:min-h-0 canvas:rounded-2xl`}
        style={delay(240)}
        onPointerEnter={() => setPointerOver(true)}
        onPointerLeave={() => setPointerOver(false)}
      >
        <iframe
          src={TOUR_LAB_MAP_URL}
          title={labMap.title}
          loading="lazy"
          // Same policy as the route's CSP header, so an old cached copy is boxed in too.
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="h-full w-full"
        />
        <a
          href={TOUR_LAB_MAP_URL}
          target="_blank"
          rel="noopener"
          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1c2152]/80 px-3.5 py-2 text-xs font-semibold text-white/85 backdrop-blur transition-colors hover:bg-[#1c2152] canvas:text-[14px] group-data-[presenting]/tour:hidden"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          Open on its own
        </a>
      </figure>
    </LightSlide>
  );
}
