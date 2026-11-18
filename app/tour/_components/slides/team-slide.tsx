/* eslint-disable @next/next/no-img-element -- tour images come from our own
   /api/tour/asset proxy (CDN-cached), not from next/image's optimizer. */
import { tourAssetUrl } from "@/lib/tour";
import { CARD } from "../brand";
import { LightSlide } from "../slide-frame";
import styles from "../tour-motion.module.css";
import { stagger, type SlideProps } from "./shared";

/**
 * The staff posters: two to a row on a phone; on the canvas, four over three
 * at 168 x 210, the largest that two rows fit. The posters carry each name and
 * role as part of the artwork, so on the canvas the words under them are left
 * to screen readers.
 */
export function TeamSlide({ content, audience, meta }: SlideProps) {
  const { team } = content;
  return (
    <LightSlide meta={meta} eyebrow="The people" title={team.title} source="Staff posters: PGC Visayas">
      <ul className="flex flex-wrap justify-center gap-4 canvas:mx-auto canvas:w-[714px] canvas:gap-3.5">
        {team.members.map((member, i) => {
          const src = tourAssetUrl(member.image);
          return (
            <li
              key={member.id}
              className={`${CARD} ${styles.enter} flex w-[calc(50%-0.5rem)] shrink-0 flex-col overflow-hidden canvas:w-[168px] canvas:rounded-xl`}
              style={stagger(i)}
            >
              {/* Staff photos are 1638×2048 posters, so the frame matches that ratio and the whole picture stays in view. */}
              <div className="aspect-[1638/2048] overflow-hidden bg-[#f0e8f2]">
                {src && <img src={src} alt={member.fullName} loading="lazy" className="h-full w-full object-contain object-center" />}
              </div>
              <div className="flex flex-1 flex-col gap-0.5 border-t-4 border-[#12ca99] px-4 py-4 canvas:sr-only">
                {audience === "visual" ? (
                  <p className="text-center text-xl font-black text-[#2b3278]">{member.nickname}</p>
                ) : (
                  <>
                    <p className="text-lg font-black text-[#2b3278]">{member.nickname}</p>
                    <p className="text-xs font-medium text-[#333333]">{member.fullName}</p>
                    <p className="mt-1 font-quicksand text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a7558]">{member.position}</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </LightSlide>
  );
}
