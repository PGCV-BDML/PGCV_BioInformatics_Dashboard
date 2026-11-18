/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import { tourAssetUrl } from "@/lib/tour";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { stagger, type SlideProps } from "./shared";

/** The decks' `photos`: the trainings in one row of tall photos. */
export function TrainingsSlide({ content, audience, meta }: SlideProps) {
  const { trainings } = content;
  return (
    <LightSlide
      meta={meta}
      eyebrow="Learn with us"
      title={trainings.title}
      intro={audience !== "visual" && <TourCopy text={trainings.intro} audience={audience} />}
      source="Photos: PGC Visayas Bioinformatics Laboratory"
    >
      <ul className="grid gap-5 canvas:h-full canvas:auto-cols-fr canvas:grid-flow-col canvas:gap-4">
        {trainings.items.map((training, i) => {
          const src = tourAssetUrl(training.image);
          return (
            <li
              key={training.name}
              className={`${styles.enter} group relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#f0e8f2] canvas:aspect-auto canvas:h-full`}
              style={stagger(i)}
            >
              {src && (
                <img
                  src={src}
                  alt={`${training.name} training session`}
                  loading="lazy"
                  className={`${styles.kenBurns} h-full w-full object-cover transition-transform duration-500 group-hover:scale-105`}
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(28,33,82,0.92),rgba(28,33,82,0))] px-5 pb-4 pt-16 canvas:px-4 canvas:pb-3.5">
                <p className="text-lg font-bold leading-tight text-white canvas:text-[18px]">{training.name}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </LightSlide>
  );
}
