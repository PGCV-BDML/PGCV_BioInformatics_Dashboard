import type { CSSProperties } from "react";
import type { Audience, TourTraining } from "@/lib/tour";
import { SERVICE_HEX } from "../brand";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import { TrainingDisc } from "../training-icons";
import { useReveal } from "../use-reveal";
import styles from "../tour-motion.module.css";
import { delay, type SlideProps } from "./shared";

/*
 * The line from one stop's disc to the next one's: across the slide on the
 * canvas, down it on a phone. It starts at the middle of this stop's disc and
 * ends under the next one's. Together the pieces draw one logo gradient, from
 * orange at the first training to blue at the last: each piece's background
 * is the whole path long (--path-size), moved along to its own part
 * (--path-at). The colours are LOGO's orange, crimson, purple and blue,
 * written out because Tailwind only finds literal class names.
 */
const LINE_BASE =
  "h-[calc(100%+32px)] w-1 bg-[linear-gradient(to_bottom,#ff8601,#c51b4a,#8a2990,#0176c3)] " +
  "[background-size:100%_var(--path-size)] [background-position:0_var(--path-at)] " +
  "canvas:left-1/2 canvas:h-1 canvas:w-[calc(100%+16px)] canvas:bg-[linear-gradient(to_right,#ff8601,#c51b4a,#8a2990,#0176c3)] " +
  "canvas:[background-size:var(--path-size)_100%] canvas:[background-position:var(--path-at)_0]";
const LINE = {
  normal: `${LINE_BASE} left-[34px] top-9 canvas:top-[62px]`,
  large: `${LINE_BASE} left-[46px] top-12 canvas:top-[78px]`,
};

/** Where piece `i` of `pieces` sits in the gradient, as a background position. */
function pathAt(i: number, pieces: number): string {
  return pieces > 1 ? `${(i / (pieces - 1)) * 100}%` : "0%";
}

function TrainingStop({
  training,
  audience,
  order,
  count,
}: {
  training: TourTraining;
  audience: Audience;
  order: number;
  count: number;
}) {
  const color = SERVICE_HEX[training.color];
  // Visual: a bigger icon and the name, nothing to read.
  const visual = audience === "visual";
  const start = 200 + order * 120;
  return (
    <li
      className={`${styles.enter} ${styles.hoverable} relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 canvas:flex canvas:flex-col canvas:items-center canvas:text-center`}
      style={delay(start)}
    >
      {order < count - 1 && (
        <span
          className={`${styles.fadeIn} absolute rounded-full ${visual ? LINE.large : LINE.normal}`}
          style={
            {
              ...delay(start + 150),
              "--path-size": `${(count - 1) * 100}%`,
              "--path-at": pathAt(order, count - 1),
            } as CSSProperties
          }
          aria-hidden="true"
        />
      )}
      <TrainingDisc id={training.id} name={training.name} color={color} delay={start} large={visual} />
      <div className={`min-w-0 ${visual ? "self-center canvas:self-auto" : "pt-1 canvas:pt-0"}`}>
        {!visual && training.scale && (
          <p
            className="font-quicksand text-xs font-bold uppercase tracking-[0.15em] canvas:mt-[18px] canvas:text-[14px]"
            style={{ color }}
          >
            {training.scale}
          </p>
        )}
        <h3
          className={`font-bold leading-tight text-balance text-[#2b3278] ${
            visual ? "text-2xl canvas:mt-6 canvas:text-[26px]" : "mt-0.5 text-lg canvas:mt-1 canvas:text-[20px]"
          }`}
        >
          {training.name}
        </h3>
        {!visual && training.summary && (
          <p className="mt-1.5 leading-relaxed text-[#5b6770] canvas:mt-2 canvas:px-1 canvas:text-[18px] canvas:leading-[1.45]">
            <TourCopy text={training.summary} audience={audience} />
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The trainings as one path, from the command line to a whole genome: each an
 * icon on a disc, with what it works on, its name and one line on what you
 * learn. No photos: the icons stand in for them.
 */
export function TrainingsSlide({ content, audience, meta }: SlideProps) {
  const { trainings } = content;
  const [ref, reveal] = useReveal<HTMLOListElement>();
  const visual = audience === "visual";
  return (
    <LightSlide
      meta={meta}
      eyebrow="Learn with us"
      title={trainings.title}
      intro={!visual && <TourCopy text={trainings.intro} audience={audience} />}
      takeaway={!visual && trainings.takeaway && <TourCopy text={trainings.takeaway} audience={audience} />}
    >
      <ol
        ref={ref}
        data-reveal={reveal}
        className={`grid gap-8 canvas:h-full canvas:auto-cols-fr canvas:grid-flow-col canvas:gap-4 ${visual ? "canvas:content-center" : ""}`}
      >
        {trainings.items.map((training, i) => (
          <TrainingStop
            key={`${training.id}-${i}`}
            training={training}
            audience={audience}
            order={i}
            count={trainings.items.length}
          />
        ))}
      </ol>
    </LightSlide>
  );
}
