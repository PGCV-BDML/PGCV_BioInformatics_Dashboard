import type { Metadata } from "next";
import { getTourContent, getTourPhylo } from "@/lib/tour-content";
import { summarizePhylo } from "@/lib/tour-phylo";
import { getTourCovidStats } from "@/lib/tour-stats";
import { TourExperience } from "./_components/tour-experience";

/**
 * Public Lab Tour page for visiting schools and institutions. Lives outside
 * /dashboard so it needs no sign-in. Text and photos come from the
 * pgcv-tour-content repo; COVID-19 numbers are aggregates from Supabase, and
 * the variant tree is a slimmed Nextstrain build (scripts/slim-auspice.mjs).
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Lab Tour · PGC Visayas Bioinformatics Lab" },
  description:
    "Services, computing infrastructure, trainings and team of the Bioinformatics and Data Management Laboratory, Philippine Genome Center Visayas.",
};

export default async function TourPage() {
  const [{ content }, stats] = await Promise.all([getTourContent(), getTourCovidStats()]);
  const phylo = await getTourPhylo(content.nextstrain?.tree);
  return <TourExperience content={content} stats={stats} phylo={phylo ? summarizePhylo(phylo) : null} />;
}
