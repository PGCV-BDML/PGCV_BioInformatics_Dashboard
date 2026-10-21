import { italicSpans, resolveText, type Audience, type TourText } from "@/lib/tour";

/**
 * Tour copy for one audience. `*...*` spans are set in italics, which is how
 * scientific names are marked in tour.json and the built-in copy. <i> rather
 * than <em>: HTML reserves it for taxonomic names, and screen readers don't
 * stress it.
 */
export function TourCopy({ text, audience }: { text: TourText; audience: Audience }) {
  return italicSpans(resolveText(text, audience)).map((span, i) =>
    span.italic ? <i key={i}>{span.text}</i> : span.text,
  );
}
