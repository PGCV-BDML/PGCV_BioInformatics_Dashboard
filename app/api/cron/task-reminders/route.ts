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
  const comingUp = await supabase.rpc("enqueue_task_coming_up_notifications");

  if (comingUp.error) {
    console.error("enqueue_task_coming_up_notifications failed:", comingUp.error);
    return NextResponse.json({ error: "Enqueue failed" }, { status: 500 });
  }

  const pastDue = await supabase.rpc("enqueue_task_past_due_notifications");

  if (pastDue.error) {
    console.error("enqueue_task_past_due_notifications failed:", pastDue.error);
    return NextResponse.json({ error: "Enqueue failed" }, { status: 500 });
  }

  const comingUpInserted = comingUp.data ?? 0;
  const pastDueInserted = pastDue.data ?? 0;

  return NextResponse.json({
    ok: true,
    inserted: comingUpInserted + pastDueInserted,
    coming_up: comingUpInserted,
    past_due: pastDueInserted,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
