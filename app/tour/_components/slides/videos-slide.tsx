import { CARD } from "../brand";
import { LightSlide } from "../slide-frame";
import styles from "../tour-motion.module.css";
import { stagger, type SlideProps } from "./shared";

/** The decks' `videos`: up to three in a row. */
export function VideosSlide({ content, meta }: Omit<SlideProps, "audience">) {
  const { videos } = content;
  return (
    <LightSlide meta={meta} eyebrow="See it in action" title={videos.title}>
      <ul className="grid gap-6 canvas:grid-cols-[repeat(auto-fit,minmax(340px,1fr))] canvas:items-start canvas:gap-5">
        {videos.items.map((video, i) => (
          <li key={video.id} className={`${CARD} ${styles.enter} overflow-hidden`} style={stagger(i)}>
            <div className="aspect-video bg-[#1c2152]">
              {video.youtubeId ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                video.url && <video className="h-full w-full" src={video.url} controls preload="none" />
              )}
            </div>
            <p className="flex items-baseline justify-between gap-3 px-5 py-4 canvas:py-3">
              <span className="font-semibold text-[#2b3278] canvas:text-[18px]">{video.title}</span>
              {video.duration && <span className="text-sm text-[#5b6770] canvas:text-[14px]">{video.duration}</span>}
            </p>
          </li>
        ))}
      </ul>
    </LightSlide>
  );
}
