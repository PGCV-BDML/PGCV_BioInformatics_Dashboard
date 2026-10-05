import { NextResponse } from "next/server";
import {
  fetchRepoDownloadUrl,
  fetchRepoFileRaw,
  GithubModulesError,
  verifyViewToken,
  viewUrlForPath,
} from "@/lib/github-modules";
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
 * Serves bioinfo-modules files to anyone holding a valid viewer token
 * (minted by /api/training-modules/link for signed-in users). The token sits
 * in the path, so a module's relative links (dataset/, ../index.html,
 * sample_R1.fastq.gz) resolve back through this route with the same token.
 *
 * HTML is streamed from our origin so it renders (raw.githubusercontent.com
 * serves text/plain) and keeps localStorage progress, as the old
 * public/assets/Training copies did. Everything else redirects to GitHub's
 * short-lived download URL so large datasets skip the function entirely.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path: segments } = await params;

  if (!verifyViewToken(token)) {
    return new NextResponse(
      "This module link has expired. Open the module again from the dashboard.",
      { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const path = segments.map(safeDecode).join("/");
  if (!isSafeRepoPath(path)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const last = segments[segments.length - 1] ?? "";
  if (!last.includes(".")) {
    // A folder link such as "dataset/": land on its index page so relative
    // links inside it resolve against the folder, not its parent.
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
    const status = error instanceof GithubModulesError ? error.status : 502;
    if (status !== 404) console.error("Failed to serve module file:", error);
    return new NextResponse(
      status === 404 ? "Not found" : "Couldn't load this file from GitHub.",
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}
