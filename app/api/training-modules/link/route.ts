import { NextResponse } from "next/server";
import { getUserFromAuthorizationHeader } from "@/lib/push-auth";
import {
  createViewToken,
  isGithubModulesConfigured,
  viewUrlForPath,
} from "@/lib/github-modules";
import { isSafeRepoPath } from "@/lib/module-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mints a short-lived viewer URL for one file in the modules repo. */
export async function POST(request: Request) {
  const auth = await getUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGithubModulesConfigured()) {
    return NextResponse.json(
      { error: "The module library isn't connected yet." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    path?: unknown;
  } | null;
  const path = typeof body?.path === "string" ? body.path.trim() : "";
  if (!isSafeRepoPath(path)) {
    return NextResponse.json({ error: "Invalid module path" }, { status: 400 });
  }

  return NextResponse.json({ url: viewUrlForPath(path, createViewToken()) });
}
