"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, Check, Smartphone, X } from "lucide-react";
import {
  bootstrapPushDispatch,
  disablePushNotifications,
  enablePushNotifications,
  getExistingPushSubscription,
} from "@/lib/push-client";
import {
  getPushSetupState,
  readPushEnvFromBrowser,
  type PushSetupState,
} from "@/lib/push-support";

const BANNER_DISMISS_KEY = "pgcv-push-banner-dismissed";
const BANNER_DISMISS_EVENT = "pgcv-push-banner-dismissed";

function subscribeToBannerDismiss(onChange: () => void) {
  window.addEventListener(BANNER_DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(BANNER_DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getBannerDismissed() {
  return window.localStorage.getItem(BANNER_DISMISS_KEY) === "1";
}

type Variant = "banner" | "card";

function setupCopy(state: PushSetupState, isIos: boolean): {
  title: string;
  body: string;
  action?: "enable" | "disable";
  actionLabel?: string;
} {
  switch (state) {
    case "not_configured":
      return {
        title: "Phone alerts are not configured yet",
        body: "A lab admin still needs to add VAPID keys on the hosting project. In-app notifications continue to work.",
      };
    case "unsupported":
      return {
        title: "This browser cannot receive lock-screen alerts",
        body: isIos
          ? "Use Safari on iOS 16.4 or later, then add the dashboard to your Home Screen."
          : "Use Chrome or Edge on Android, or Chrome/Firefox/Edge on a computer.",
      };
    case "ios_install":
      return {
        title: "Add this app to your iPhone Home Screen",
        body: "In Safari, tap Share → Add to Home Screen. Open it from the new icon, then tap Enable alerts. iOS only delivers push from that installed app, not from a Safari tab.",
      };
    case "denied":
      return {
        title: "Alerts are blocked",
        body: isIos
          ? "Open iPhone Settings → Notifications → PGCV Dashboard and allow alerts, then return here."
          : "Allow notifications for this site in your browser settings, then return here.",
      };
    case "subscribed":
      return {
        title: "Lock-screen alerts are on",
        body: "This device will notify you for review, approval, and incident assignments even when the dashboard is closed.",
        action: "disable",
        actionLabel: "Turn off on this device",
      };
    case "prompt":
    default:
      return {
        title: isIos ? "Enable alerts on this iPhone" : "Enable phone alerts",
        body: isIos
          ? "Allow notifications so review and incident assignments reach you when the app is closed."
          : "Android and desktop browsers can receive alerts after you allow notifications. Adding the app to your home screen is optional but recommended.",
        action: "enable",
        actionLabel: "Enable alerts",
      };
  }
}

export function PushNotificationSetup({ variant }: { variant: Variant }) {
  const [state, setState] = useState<PushSetupState | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissed = useSyncExternalStore(
    subscribeToBannerDismiss,
    getBannerDismissed,
    () => true,
  );

  const refresh = useCallback(async () => {
    const env = readPushEnvFromBrowser();
    let configured = Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(),
    );
    let subscribed = false;
    try {
      const bootstrap = await bootstrapPushDispatch();
      configured = bootstrap.configured;
    } catch {
      // Keep the public-key heuristic if bootstrap is unavailable.
    }
    try {
      subscribed = Boolean(await getExistingPushSubscription());
    } catch {
      subscribed = false;
    }
    setIsIos(env.isIos);
    setState(
      getPushSetupState({
        configured,
        subscribed,
        ...env,
      }),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      await enablePushNotifications();
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      await disablePushNotifications();
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not turn off notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(BANNER_DISMISS_KEY, "1");
    window.dispatchEvent(new Event(BANNER_DISMISS_EVENT));
  }

  if (state == null) return null;

  if (variant === "banner") {
    if (dismissed) return null;
    if (state === "subscribed" || state === "not_configured") return null;
    if (state !== "ios_install" && state !== "prompt") return null;
  }

  const copy = setupCopy(state, isIos);

  if (variant === "banner") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#2a7797]/20 bg-brand-tint px-3 py-2.5 text-[#17333d]">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#2a7797]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold font-aileron">{copy.title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600 font-aileron">
            {copy.body}
          </p>
          {error ? (
            <p className="mt-1 text-[11px] text-red-700">{error}</p>
          ) : null}
          {copy.action === "enable" ? (
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={busy}
              className="mt-2 inline-flex h-8 items-center rounded-full bg-[#2a7797] px-3 text-[11px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "Enabling…" : copy.actionLabel}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-500 hover:bg-white/70 hover:text-slate-800"
          aria-label="Dismiss phone alerts reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        {state === "subscribed" ? (
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[#2a7797]" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[#17333d] font-aileron">
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 font-aileron">
            {copy.body}
          </p>
          {isIos && state === "prompt" ? (
            <p className="mt-2 text-[11px] text-slate-500 font-aileron">
              You are already in the Home Screen app. Android users can allow
              alerts in Chrome without installing first.
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-red-700">{error}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {copy.action === "enable" ? (
              <button
                type="button"
                onClick={() => void handleEnable()}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full bg-[#2a7797] px-4 text-xs font-bold text-white shadow-sm disabled:opacity-60"
              >
                {busy ? "Enabling…" : copy.actionLabel}
              </button>
            ) : null}
            {copy.action === "disable" ? (
              <button
                type="button"
                onClick={() => void handleDisable()}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {busy ? "Updating…" : copy.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
