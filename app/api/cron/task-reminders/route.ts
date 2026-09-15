import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { isNotificationHours } from "@/lib/notification-hours";
import { createAnonSupabaseClient } from "@/lib/push-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isNotificationHours()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_notification_hours",
    });
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

  const flushed = await supabase.rpc("flush_deferred_push_dispatches");

  if (flushed.error) {
    console.error("flush_deferred_push_dispatches failed:", flushed.error);
    return NextResponse.json({ error: "Flush failed" }, { status: 500 });
  }

  const comingUpInserted = comingUp.data ?? 0;
  const pastDueInserted = pastDue.data ?? 0;
  const flushedCount = flushed.data ?? 0;

  return NextResponse.json({
    ok: true,
    inserted: comingUpInserted + pastDueInserted,
    coming_up: comingUpInserted,
    past_due: pastDueInserted,
    flushed: flushedCount,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
