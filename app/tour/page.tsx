import type { Metadata } from "next";
import { getTourContent } from "@/lib/tour-content";
import { getTourCovidStats } from "@/lib/tour-stats";
import { TourExperience } from "./_components/tour-experience";

/**
 * Public Lab Tour page for visiting schools and institutions. Lives outside
 * /dashboard so it needs no sign-in. Text and photos come from the
 * pgcv-tour-content repo; COVID-19 numbers are aggregates from Supabase.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Lab Tour · PGC Visayas Bioinformatics Lab" },
  description:
    "Services, computing infrastructure, trainings and team of the Bioinformatics and Data Management Laboratory, Philippine Genome Center Visayas.",
};

export default async function TourPage() {
  const [{ content }, stats] = await Promise.all([getTourContent(), getTourCovidStats()]);
  return <TourExperience content={content} stats={stats} />;
}
