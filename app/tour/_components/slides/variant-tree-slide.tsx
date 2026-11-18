import dynamic from "next/dynamic";
import { formatMonth, type TourPhyloSummary } from "@/lib/tour-phylo";
import { CountUp } from "../count-up";
import { LightSlide } from "../slide-frame";
import { TourCopy } from "../tour-copy";
import type { SlideProps } from "./shared";

// ~11k-node SVG and its data load after the rest of the tour.
const PhyloTree = dynamic(() => import("../phylo-tree").then((m) => m.PhyloTree), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-[#2b3278]/10 bg-white text-sm text-[#5b6770] canvas:h-full canvas:text-[18px]">
      Loading the variant tree…
    </div>
  ),
});

/** The deck's `tree`: the variant tree, monthly counts and map in one card. */
export function VariantTreeSlide({ content, audience, meta, summary }: SlideProps & { summary: TourPhyloSummary }) {
  const nextstrain = content.nextstrain!;
  const provinces = summary.provinces.filter((p) => p.count > 0 && p.name !== "Other").length;
  // On the canvas: right of the title, the count on one line and the dates and provinces under it.
  const totals = (
    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[#2b3278] canvas:w-[300px] canvas:justify-end canvas:gap-x-3 canvas:gap-y-0">
      <div className="flex items-baseline gap-1.5 canvas:basis-full canvas:justify-end">
        <dd className="text-2xl font-black tabular-nums canvas:text-[30px] canvas:leading-tight">
          <CountUp value={summary.tipCount.toLocaleString("en-PH")} />
        </dd>
        <dt className="text-sm font-semibold canvas:text-[18px]">genomes</dt>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="sr-only">Sampled</dt>
        <dd className="text-sm font-semibold canvas:text-[14px]">
          {formatMonth(summary.firstMonth)} – {formatMonth(summary.lastMonth)}
        </dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dd className="text-sm font-semibold canvas:text-[14px]">{provinces}</dd>
        <dt className="text-sm font-semibold canvas:text-[14px]">provinces</dt>
      </div>
    </dl>
  );
  return (
    <LightSlide
      meta={meta}
      eyebrow="Tracking the variants"
      title={nextstrain.title}
      intro={audience !== "visual" && <TourCopy text={nextstrain.intro} audience={audience} />}
      aside={totals}
      source="Built with Nextstrain · each dot is one sequenced virus · dates rounded to the month · no sample IDs or patient details"
    >
      <PhyloTree summary={summary} />
    </LightSlide>
  );
}
