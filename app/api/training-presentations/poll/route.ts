import { NextResponse } from "next/server";
import {
  createUserSupabaseClient,
  getUserFromAuthorizationHeader,
} from "@/lib/push-auth";
import {
  isDeckId,
  isProgramId,
  pollStatusForRpcError,
} from "@/lib/training-poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RpcError = { code?: string; message?: string };

function rpcFailure(error: RpcError) {
  const mapped = pollStatusForRpcError(error);
  if (mapped.status === 500) console.error("Training poll failed:", error);
  return NextResponse.json({ error: mapped.error }, { status: mapped.status });
}

async function caller(request: Request) {
  const auth = await getUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!auth) return null;
  return createUserSupabaseClient(auth.accessToken);
}

function idsFrom(program: unknown, deck: unknown) {
  const programId = typeof program === "string" ? program.trim() : "";
  const deckId = typeof deck === "string" ? deck.trim() : "";
  if (!isProgramId(programId) || !isDeckId(deckId)) return null;
  return { programId, deckId };
}

export async function GET(request: Request) {
  const supabase = await caller(request);
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const ids = idsFrom(url.searchParams.get("program"), url.searchParams.get("deck"));
  if (!ids) {
    return NextResponse.json({ error: "Invalid poll." }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("poll_state", {
    p_program: ids.programId,
    p_deck: ids.deckId,
  });
  if (error) return rpcFailure(error);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await caller(request);
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    programId?: unknown;
    deckId?: unknown;
    option?: unknown;
    question?: unknown;
  } | null;
  const ids = idsFrom(body?.programId, body?.deckId);
  if (!ids) {
    return NextResponse.json({ error: "Invalid poll." }, { status: 400 });
  }

  if (body?.action === "question") {
    const { data, error } = await supabase.rpc("poll_set_question", {
      p_program: ids.programId,
      p_deck: ids.deckId,
      p_question: body.question ?? null,
    });
    if (error) return rpcFailure(error);
    return NextResponse.json(data);
  }

  if (body?.action === "vote") {
    const option = Number(body.option);
    if (!Number.isInteger(option)) {
      return NextResponse.json({ error: "That answer doesn't fit this question." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("poll_vote", {
      p_program: ids.programId,
      p_deck: ids.deckId,
      p_option: option,
    });
    if (error) return rpcFailure(error);
    return NextResponse.json(data);
  }

  if (body?.action === "clear") {
    const { data, error } = await supabase.rpc("poll_clear", {
      p_program: ids.programId,
      p_deck: ids.deckId,
    });
    if (error) return rpcFailure(error);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unknown poll action." }, { status: 400 });
}
