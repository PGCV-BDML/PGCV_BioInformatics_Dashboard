import { NextResponse } from "next/server";
import {
  createUserSupabaseClient,
  getUserFromAuthorizationHeader,
} from "@/lib/push-auth";
import {
  createViewToken,
  getPresentationCatalog,
  GithubPresentationsError,
  isGithubPresentationsConfigured,
  viewUrlForPath,
} from "@/lib/github-presentations";
import { isSafeModuleId } from "@/lib/module-library";
import { isProgramId, withProgramQuery } from "@/lib/training-poll";

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
    programId?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const programId = typeof body?.programId === "string" ? body.programId.trim() : "";
  if (!isSafeModuleId(id) || (programId && !isProgramId(programId))) {
    return NextResponse.json({ error: "Invalid presentation id" }, { status: 400 });
  }

  try {
    if (programId) {
      const allowed = await canJoinProgramPoll(auth.accessToken, auth.user.id, programId);
      if (!allowed) {
        return NextResponse.json(
          { error: "You can't open this presentation for that training." },
          { status: 403 },
        );
      }
    }
    const item = (await getPresentationCatalog()).find((deck) => deck.id === id);
    if (!item) {
      return NextResponse.json(
        { error: "This presentation is no longer in the library." },
        { status: 404 },
      );
    }
    const path = viewUrlForPath(item.path, createViewToken());
    return NextResponse.json({
      url: programId ? withProgramQuery(path, programId, id) : path,
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

async function canJoinProgramPoll(
  accessToken: string,
  userId: string,
  programId: string,
): Promise<boolean> {
  const supabase = createUserSupabaseClient(accessToken);
  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return false;
  if (profile.role === "team_lead" || profile.role === "team_member") return true;
  if (profile.role !== "trainee" && profile.role !== "intern") return false;
  const { data } = await supabase.rpc("is_enrolled_in_program", {
    p_program_id: programId,
  });
  return data === true;
}
