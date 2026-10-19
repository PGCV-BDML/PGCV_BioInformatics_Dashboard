import { NextResponse } from "next/server";
import { getUserFromAuthorizationHeader } from "@/lib/push-auth";
import {
  createViewToken,
  getPresentationCatalog,
  GithubPresentationsError,
  isGithubPresentationsConfigured,
  viewUrlForPath,
} from "@/lib/github-presentations";
import { isSafeModuleId } from "@/lib/module-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived viewer URL for a library presentation, given its
 * presentations.json `id`. The current file path is looked up each time.
 */
export async function POST(request: Request) {
  const auth = await getUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGithubPresentationsConfigured()) {
    return NextResponse.json(
      { error: "The presentation library isn't connected yet." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!isSafeModuleId(id)) {
    return NextResponse.json({ error: "Invalid presentation id" }, { status: 400 });
  }

  try {
    const item = (await getPresentationCatalog()).find((deck) => deck.id === id);
    if (!item) {
      return NextResponse.json(
        { error: "This presentation is no longer in the library." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      url: viewUrlForPath(item.path, createViewToken()),
    });
  } catch (error) {
    console.error("Failed to load presentation catalog:", error);
    const status = error instanceof GithubPresentationsError ? error.status : 502;
    return NextResponse.json(
      { error: "Couldn't load the presentation library from GitHub." },
      { status },
    );
  }
}
