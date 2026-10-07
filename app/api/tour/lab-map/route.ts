import { NextResponse } from "next/server";
import { getTourContent, getTourLabMap } from "@/lib/tour-content";
import { LAB_MAP_CSP } from "@/lib/tour";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * The Lab Tour's lab map: the self-contained HTML page named by tour.json's
 * labMap.src. It comes from our own origin, so the CSP sandbox puts it in an
 * opaque origin of its own — its scripts can't read the dashboard's cookies,
 * storage or session — and only the tour may frame it.
 */
export async function GET() {
  const { content } = await getTourContent();
  const html = await getTourLabMap(content.labMap);
  if (!html) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": LAB_MAP_CSP,
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
