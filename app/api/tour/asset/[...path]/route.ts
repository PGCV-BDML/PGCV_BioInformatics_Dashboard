import { NextResponse } from "next/server";
import { isSafeTourAssetPath } from "@/lib/tour";
import { fetchTourRepoFile, isTourContentConfigured } from "@/lib/tour-content";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Public proxy for tour images in the private pgcv-tour-content repo. Only
 * images/*.{jpg,jpeg,png,webp} are served, and the CDN keeps them for a day
 * so a tour group loading the page doesn't hit GitHub per visitor.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const path = segments.join("/");

  if (!isSafeTourAssetPath(path) || !isTourContentConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = await fetchTourRepoFile(path, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Not found", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
