import { NextResponse } from "next/server";
import {
  createUserSupabaseClient,
  getUserFromAuthorizationHeader,
} from "@/lib/push-auth";
import {
  createViewToken,
  getModuleCatalog,
  GithubModulesError,
  isGithubModulesConfigured,
  viewUrlForPath,
} from "@/lib/github-modules";
import {
  isStaffRole,
  MATERIAL_CLOSED_ERROR,
  moduleRowMatchesTarget,
} from "@/lib/material-access";
import { isSafeModuleId, isSafeRepoPath } from "@/lib/module-library";
import { isProgramId } from "@/lib/training-poll";

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
    rowId?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  let path = typeof body?.path === "string" ? body.path.trim() : "";
  const rowId = typeof body?.rowId === "string" ? body.rowId.trim() : "";
  if (rowId && !isProgramId(rowId)) {
    return NextResponse.json({ error: "Invalid module id" }, { status: 400 });
  }

  const closed = await learnerModuleBlock(auth.accessToken, auth.user.id, {
    id,
    path,
    rowId,
  });
  if (closed) {
    return NextResponse.json({ error: closed }, { status: 403 });
  }

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

/**
 * Trainees can open only the module row they were given, and only while it
 * is open. Staff can preview a closed module. The row's stored link has to
 * match the library item, so an open row can't be used to fetch another module.
 */
async function learnerModuleBlock(
  accessToken: string,
  userId: string,
  target: { id: string; path: string; rowId: string },
): Promise<string | null> {
  const supabase = createUserSupabaseClient(accessToken);
  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return "You can't open this module.";
  if (isStaffRole(profile.role)) return null;
  if (profile.role !== "trainee" && profile.role !== "intern") {
    return "You can't open this module.";
  }
  if (!target.rowId) return MATERIAL_CLOSED_ERROR;

  const { data: row } = await supabase
    .from("module")
    .select("html_content_link, is_open")
    .eq("id", target.rowId)
    .maybeSingle();
  if (!row || row.is_open === false) return MATERIAL_CLOSED_ERROR;
  const matches = moduleRowMatchesTarget(row.html_content_link, {
    id: target.id || undefined,
    path: target.path || undefined,
  });
  return matches ? null : MATERIAL_CLOSED_ERROR;
}
