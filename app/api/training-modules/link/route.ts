import { NextResponse } from "next/server";
import { getUserFromAuthorizationHeader } from "@/lib/push-auth";
import {
  createViewToken,
  getModuleCatalog,
  GithubModulesError,
  isGithubModulesConfigured,
  viewUrlForPath,
} from "@/lib/github-modules";
import { isSafeModuleId, isSafeRepoPath } from "@/lib/module-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived viewer URL for a library module, given its modules.json
 * `id` (looked up to its current path) or, for older links, a repo `path`.
 */
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
    id?: unknown;
    path?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  let path = typeof body?.path === "string" ? body.path.trim() : "";

  if (id) {
    if (!isSafeModuleId(id)) {
      return NextResponse.json({ error: "Invalid module id" }, { status: 400 });
    }
    try {
      const item = (await getModuleCatalog()).find((m) => m.id === id);
      if (!item) {
        return NextResponse.json(
          { error: "This module is no longer in the library." },
          { status: 404 },
        );
      }
      path = item.path;
    } catch (error) {
      console.error("Failed to load module catalog:", error);
      const status = error instanceof GithubModulesError ? error.status : 502;
      return NextResponse.json(
        { error: "Couldn't load the module library from GitHub." },
        { status },
      );
    }
  } else if (!isSafeRepoPath(path)) {
    return NextResponse.json({ error: "Invalid module path" }, { status: 400 });
  }

  return NextResponse.json({ url: viewUrlForPath(path, createViewToken()) });
}
