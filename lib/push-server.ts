import { timingSafeEqual } from "node:crypto";
import { sendNotification } from "web-push";
import { createAnonSupabaseClient } from "@/lib/push-auth";
import { buildWebPushPayload, type PushNotificationInput } from "@/lib/push-payload";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function getVapidPublicKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  return key?.trim() ? key.trim() : null;
}

export function isPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}

export function getPushDispatchSecret(): string | null {
  const secret = process.env.PUSH_DISPATCH_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

export function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function readDispatchBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice("bearer ".length).trim();
  return token || null;
}

export function shouldRegisterDispatchUrl(): boolean {
  const env = process.env.VERCEL_ENV;
  return env === "production" || env == null || env === "development";
}

export function dispatchUrlFromRequest(request: Request): string {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(
    /^https?:\/\//,
    "",
  ).replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && productionHost) {
    return `https://${productionHost}/api/push/dispatch`;
  }
  return `${new URL(request.url).origin}/api/push/dispatch`;
}

function vapidDetails(): {
  subject: string;
  publicKey: string;
  privateKey: string;
} | null {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    "https://pgcv-bioinformatics-dashboard.vercel.app";
  return { subject, publicKey, privateKey };
}

export async function listSubscriptionsForUser(
  userId: string,
  secret: string,
): Promise<StoredPushSubscription[]> {
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase.rpc(
    "list_push_subscriptions_for_dispatch",
    { p_user_id: userId, p_secret: secret },
  );
  if (error) {
    console.error("list_push_subscriptions_for_dispatch failed:", error);
    throw error;
  }
  return (data ?? []) as StoredPushSubscription[];
}

export async function deleteSubscriptionEndpoint(
  endpoint: string,
  secret: string,
): Promise<void> {
  const supabase = createAnonSupabaseClient();
  const { error } = await supabase.rpc("delete_push_subscription_endpoint", {
    p_endpoint: endpoint,
    p_secret: secret,
  });
  if (error) {
    console.error("delete_push_subscription_endpoint failed:", error);
  }
}

export async function sendWebPushToUser(options: {
  origin: string;
  secret: string;
  notification: PushNotificationInput;
  targetUserId: string;
}): Promise<{ sent: number; removed: number }> {
  const details = vapidDetails();
  if (!details) {
    return { sent: 0, removed: 0 };
  }

  const copy = buildWebPushPayload(options.notification);
  const payload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    url: new URL(copy.path, options.origin).toString(),
    tag: copy.tag,
  });

  const subscriptions = await listSubscriptionsForUser(
    options.targetUserId,
    options.secret,
  );

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          {
            vapidDetails: details,
            TTL: 60 * 60 * 24,
            urgency: "high",
          },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deleteSubscriptionEndpoint(row.endpoint, options.secret);
          removed += 1;
          return;
        }
        console.error("web-push send failed:", error);
      }
    }),
  );

  return { sent, removed };
}
