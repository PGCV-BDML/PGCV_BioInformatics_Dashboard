import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createAnonSupabaseClient } from "@/lib/push-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase.rpc(
    "enqueue_task_coming_up_notifications",
  );

  if (error) {
    console.error("enqueue_task_coming_up_notifications failed:", error);
    return NextResponse.json({ error: "Enqueue failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: data ?? 0 });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
