import { NextResponse } from "next/server";
import { getUserFromAuthorizationHeader } from "@/lib/push-auth";
import {
  getPresentationCatalog,
  GithubPresentationsError,
  isGithubPresentationsConfigured,
} from "@/lib/github-presentations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGithubPresentationsConfigured()) {
    return NextResponse.json({ configured: false, presentations: [] });
  }

  try {
    const presentations = await getPresentationCatalog();
    return NextResponse.json({ configured: true, presentations });
  } catch (error) {
    console.error("Failed to load presentation catalog:", error);
    const status = error instanceof GithubPresentationsError ? error.status : 502;
    return NextResponse.json(
      { error: "Couldn't load the presentation library from GitHub." },
      { status },
    );
  }
}
