import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Sign in to enable notifications.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser cannot receive background alerts.");
  }
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export async function bootstrapPushDispatch(): Promise<{
  configured: boolean;
  publicKey: string | null;
}> {
  const headers = await authHeaders();
  const response = await fetch("/api/push/bootstrap", {
    method: "POST",
    headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || "Could not prepare push notifications.");
  }
  return (await response.json()) as {
    configured: boolean;
    publicKey: string | null;
  };
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(): Promise<void> {
  const { configured, publicKey } = await bootstrapPushDispatch();
  if (!configured || !publicKey) {
    throw new Error(
      "Push notifications are not configured on this deployment yet.",
    );
  }

  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await ensureServiceWorker();
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("The browser did not return a complete push subscription.");
  }

  const { error } = await supabase.rpc("upsert_my_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_expiration_time: json.expirationTime
      ? new Date(json.expirationTime).toISOString()
      : null,
    p_user_agent: navigator.userAgent,
  });
  if (error) {
    console.error("upsert_my_push_subscription failed:", error);
    throw new Error("Could not save this device for alerts.");
  }
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch (error) {
    console.error("Push unsubscribe failed:", error);
  }

  const { error } = await supabase.rpc("delete_my_push_subscription", {
    p_endpoint: endpoint,
  });
  if (error) {
    console.error("delete_my_push_subscription failed:", error);
  }
}
