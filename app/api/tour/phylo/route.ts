import { NextResponse } from "next/server";
import { getTourContent, getTourPhylo } from "@/lib/tour-content";
import { serializeTourPhylo } from "@/lib/tour-phylo";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * Public, slimmed SARS-CoV-2 tree for the Lab Tour's Variant tree slide.
 * Served separately from the page so the ~350 KB tree isn't inlined into
 * the HTML; the response is rebuilt from parseTourPhylo's allowlist.
 */
export async function GET() {
  const { content } = await getTourContent();
  const phylo = await getTourPhylo(content.nextstrain?.tree);
  if (!phylo) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json(serializeTourPhylo(phylo), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
