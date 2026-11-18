import { INTRO_DEFINITION, INTRO_FIELDS, INTRO_TITLE } from "@/lib/tour-intro";
import { BioinfoEquation, BioinfoVenn, INTRO_FIELD_COLORS } from "../bioinfo-venn";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { delay, stagger, type SlideProps } from "./shared";

/** The decks' `split`: the definition and the three fields beside the Venn diagram. */
export function IntroSlide({ audience, meta }: Omit<SlideProps, "content">) {
  return (
    <LightSlide meta={meta} eyebrow="Before we begin" title={INTRO_TITLE}>
      {audience === "visual" ? (
        <div className="canvas:flex canvas:h-full canvas:items-center canvas:justify-center">
          <BioinfoEquation />
        </div>
      ) : (
        <div className="grid items-center gap-8 canvas:grid-cols-2 canvas:items-start canvas:gap-10">
          <div>
            <p className={`text-lg leading-relaxed text-[#5b6770] canvas:text-[22px] canvas:leading-normal ${styles.enter}`} style={delay(160)}>
              <TourCopy text={INTRO_DEFINITION} audience={audience} />
            </p>
            <ul className="mt-6 space-y-3 canvas:space-y-2.5">
              {INTRO_FIELDS.map((field, i) => {
                const color = INTRO_FIELD_COLORS[field.id].ink;
                return (
                  <li
                    key={field.id}
                    className={`rounded-r-xl border-l-4 bg-white/70 py-2 pl-4 pr-3 leading-relaxed text-[#5b6770] canvas:bg-white canvas:text-[22px] canvas:leading-[1.45] canvas:shadow-[0_6px_18px_-12px_rgba(43,50,120,0.3)] ${styles.enter}`}
                    style={{ borderColor: color, ...stagger(i, 320) }}
                  >
                    <span className="font-bold" style={{ color }}>
                      {field.name}
                    </span>{" "}
                    <TourCopy text={field.role} audience={audience} />
                  </li>
                );
              })}
            </ul>
          </div>
          <BioinfoVenn className="mx-auto w-full max-w-[34rem] canvas:-mt-6 canvas:max-w-[470px]" />
        </div>
      )}
    </LightSlide>
  );
}
