import { NextResponse } from "next/server";
import {
  fetchRepoDownloadUrl,
  fetchRepoFileRaw,
  GithubPresentationsError,
  verifyViewToken,
  viewUrlForPath,
} from "@/lib/github-presentations";
import { isSafeRepoPath } from "@/lib/module-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Serves bioinfo-presentations files to anyone holding a valid viewer token
 * (minted by /api/training-presentations/link for signed-in users). The token
 * sits in the path so a deck's relative images resolve back through this route.
 *
 * HTML is streamed from our origin so it renders. Other files redirect to
 * GitHub's short-lived download URL.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path: segments } = await params;

  if (!verifyViewToken(token)) {
    return new NextResponse(
      "This presentation link has expired. Open the presentation again from the dashboard.",
      { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const path = segments.map(safeDecode).join("/");
  if (!isSafeRepoPath(path)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const last = segments[segments.length - 1] ?? "";
  if (!last.includes(".")) {
    return NextResponse.redirect(
      new URL(viewUrlForPath(`${path}/index.html`, token), request.url),
    );
  }

  const corsHeaders = { "Access-Control-Allow-Origin": "*" };

  try {
    if (/\.html?$/i.test(path)) {
      const upstream = await fetchRepoFileRaw(path);
      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      });
    }

    const downloadUrl = await fetchRepoDownloadUrl(path);
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      headers: { ...corsHeaders, "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof GithubPresentationsError ? error.status : 502;
    if (status !== 404) console.error("Failed to serve presentation file:", error);
    return new NextResponse(
      status === 404 ? "Not found" : "Couldn't load this file from GitHub.",
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}
