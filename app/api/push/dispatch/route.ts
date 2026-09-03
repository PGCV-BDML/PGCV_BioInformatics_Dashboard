import { NextResponse } from "next/server";
import {
  getPushDispatchSecret,
  readDispatchBearer,
  secretsEqual,
  sendWebPushToUser,
} from "@/lib/push-server";
import type { PushNotificationInput } from "@/lib/push-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DispatchBody = {
  id?: unknown;
  type?: unknown;
  payload?: unknown;
  target_user_id?: unknown;
};

function asNotification(body: DispatchBody): PushNotificationInput | null {
  if (typeof body.id !== "string" || typeof body.type !== "string") {
    return null;
  }
  if (typeof body.target_user_id !== "string") return null;
  const payload =
    body.payload && typeof body.payload === "object"
      ? (body.payload as PushNotificationInput["payload"])
      : {};
  return { id: body.id, type: body.type, payload };
}

export async function POST(request: Request) {
  const expected = getPushDispatchSecret();
  const provided = readDispatchBearer(request);
  if (!expected || !provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DispatchBody;
  try {
    body = (await request.json()) as DispatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notification = asNotification(body);
  if (!notification || typeof body.target_user_id !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const result = await sendWebPushToUser({
    origin,
    secret: expected,
    notification,
    targetUserId: body.target_user_id,
  });

  return NextResponse.json({ ok: true, ...result });
}
