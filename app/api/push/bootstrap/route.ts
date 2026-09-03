import { NextResponse } from "next/server";
import {
  dispatchUrlFromRequest,
  getPushDispatchSecret,
  getVapidPublicKey,
  isPushConfigured,
  shouldRegisterDispatchUrl,
} from "@/lib/push-server";
import {
  createUserSupabaseClient,
  getUserFromAuthorizationHeader,
} from "@/lib/push-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = getPushDispatchSecret();
  if (secret && shouldRegisterDispatchUrl()) {
    const supabase = createUserSupabaseClient(auth.accessToken);
    const { error } = await supabase.rpc("ensure_push_dispatch_settings", {
      p_url: dispatchUrlFromRequest(request),
      p_secret: secret,
    });
    if (error) {
      console.error("ensure_push_dispatch_settings failed:", error);
    }
  }

  return NextResponse.json({
    configured: isPushConfigured() && Boolean(secret),
    publicKey: getVapidPublicKey(),
  });
}
