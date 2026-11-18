import type { ShowcaseCopy } from "@/lib/tour-showcase";
import { LightSlide } from "../slide-frame";
import { ShowcaseFigures } from "../service-showcase";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { delay, type SlideProps } from "./shared";

export const SAMPLE_DATA_NOTE = "Sample data for illustration, not from a real project";

/**
 * One service's report figures, as in the deck's Sample results slides: its
 * two figures side by side, and the caption as the takeaway.
 */
export function ResultsSlide({ item, audience, meta }: Omit<SlideProps, "content"> & { item: ShowcaseCopy }) {
  return (
    <LightSlide
      meta={meta}
      eyebrow={`What you get · ${item.service}`}
      title={<TourCopy text={item.title} audience={audience} />}
      takeaway={audience !== "visual" && <TourCopy text={item.caption} audience={audience} />}
      source={SAMPLE_DATA_NOTE}
    >
      <div className={`canvas:h-full ${styles.enter}`} style={delay(240)}>
        <ShowcaseFigures id={item.id} />
      </div>
    </LightSlide>
  );
}
