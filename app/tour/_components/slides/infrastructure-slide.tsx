/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import { tourAssetUrl } from "@/lib/tour";
import { BRAND } from "../brand";
import { CountUp } from "../count-up";
import { LightSlide } from "../slide-frame";
import { specIcon } from "../spec-icon";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { stagger, type SlideProps } from "./shared";

const SPEC_COLORS = [BRAND.tealInk, BRAND.deepTeal, BRAND.purple];

/**
 * The decks' `feature`: the machines side by side, each with its photo beside
 * its words and its specs along the bottom. The "in simple terms" analogy is
 * the slide's intro.
 */
export function InfrastructureSlide({ content, audience, meta }: SlideProps) {
  const { infrastructure } = content;
  return (
    <LightSlide
      meta={meta}
      eyebrow="Under the hood"
      title={infrastructure.title}
      intro={audience !== "visual" && <TourCopy text={infrastructure.analogy} audience={audience} />}
    >
      {/* On the canvas the cards share two rows through subgrid (photo and words,
          then specs), so both cards are the same height and their spec tiles
          start on the same line and match in size, whatever the copy's length. */}
      <div className="space-y-6 canvas:grid canvas:auto-cols-fr canvas:grid-flow-col canvas:grid-rows-[auto_auto] canvas:gap-x-6 canvas:gap-y-0 canvas:space-y-0">
        {infrastructure.items.map((item, itemIndex) => {
          const src = tourAssetUrl(item.image);
          return (
            <article
              key={item.id}
              style={stagger(itemIndex)}
              className={`${styles.enter} flex flex-col gap-6 rounded-3xl border border-[#2b3278]/10 bg-white p-6 shadow-[0_10px_30px_-12px_rgba(43,50,120,0.18)] canvas:row-span-2 canvas:grid canvas:grid-rows-subgrid canvas:gap-0 canvas:rounded-2xl canvas:px-5 canvas:py-[18px]`}
            >
              <div className="flex flex-col gap-6 canvas:grid canvas:grid-cols-[136px_minmax(0,1fr)] canvas:items-start canvas:gap-5">
                {src && (
                  <div className="flex h-72 items-center justify-center rounded-2xl bg-[radial-gradient(circle,#ffffff_0%,#dff3ee_100%)] p-6 canvas:h-[136px] canvas:p-3">
                    <img src={src} alt={`${item.name} photo`} loading="lazy" className="h-full w-auto object-contain" />
                  </div>
                )}
                <div className={src ? "" : "canvas:col-span-2"}>
                  {item.kicker && (
                    <p className="font-quicksand text-xs font-bold uppercase tracking-[0.15em] text-[#0a7558] canvas:text-[14px]">{item.kicker}</p>
                  )}
                  <h3 className="mt-1 text-3xl font-black text-[#2b3278] canvas:text-[30px] canvas:leading-tight">{item.name}</h3>
                  {audience !== "visual" && (
                    <p className="mt-2 text-lg text-[#5b6770] canvas:mt-1.5 canvas:text-[18px] canvas:leading-[1.45]">
                      <TourCopy text={item.description} audience={audience} />
                    </p>
                  )}
                </div>
              </div>
              <dl className="mt-2 grid gap-4 canvas:mt-3.5 canvas:grid-cols-3 canvas:gap-2.5">
                {item.specs.map((spec, i) => {
                  const color = SPEC_COLORS[i % SPEC_COLORS.length];
                  const Icon = specIcon(spec);
                  return (
                    <div
                      key={spec.label || i}
                      className="flex flex-col rounded-2xl border-l-4 bg-[#f7f6fa] px-5 py-4 canvas:rounded-xl canvas:px-3.5 canvas:py-2.5"
                      style={{ borderColor: color }}
                    >
                      {/* Value first on screen, label under it; the label stays first for screen readers. */}
                      <dt className="order-last mt-1 text-sm font-medium leading-snug text-[#5b6770] canvas:mt-0.5 canvas:text-[14px]">{spec.label}</dt>
                      <dd>
                        {Icon && (
                          <Icon className="mb-2 h-5 w-5 opacity-70 canvas:mb-1 canvas:h-[18px] canvas:w-[18px]" style={{ color }} aria-hidden="true" />
                        )}
                        <span className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="text-5xl font-black tracking-tight canvas:text-[30px] canvas:leading-tight" style={{ color }}>
                            <CountUp value={spec.value} />
                          </span>
                          <span className="text-xl font-bold text-[#2b3278]/80 canvas:text-[18px]">{spec.unit}</span>
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </article>
          );
        })}
      </div>
    </LightSlide>
  );
}
