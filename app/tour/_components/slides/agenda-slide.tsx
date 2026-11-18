import { AGENDA, AGENDA_INTRO, AGENDA_TITLE } from "@/lib/tour-agenda";
import { AgendaAreaCard } from "../research-agenda";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { stagger, type SlideProps } from "./shared";

/** The decks' `cards`: the five research areas in one row. */
export function AgendaSlide({ audience, meta }: Omit<SlideProps, "content">) {
  return (
    <LightSlide
      meta={meta}
      eyebrow="Genomics for a better Philippines"
      title={AGENDA_TITLE}
      intro={audience !== "visual" && <TourCopy text={AGENDA_INTRO} audience={audience} />}
    >
      <ul className="grid gap-4 canvas:h-full canvas:auto-cols-fr canvas:grid-flow-col">
        {AGENDA.map((area, i) => (
          <li key={area.id} className={styles.enter} style={stagger(i)}>
            <AgendaAreaCard area={area} audience={audience} />
          </li>
        ))}
      </ul>
    </LightSlide>
  );
}
