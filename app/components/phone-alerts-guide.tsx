"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { isIosUserAgent } from "@/lib/push-support";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a7797] text-[11px] font-bold text-white">
        {n}
      </span>
      <p className="text-[13px] leading-relaxed text-slate-600 font-quicksand">
        {children}
      </p>
    </li>
  );
}

function DeviceCard({
  title,
  subtitle,
  highlight,
  children,
}: {
  title: string;
  subtitle: string;
  highlight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#2a7797] bg-[#e6f4f8]/60 ring-1 ring-[#2a7797]/30"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-bold text-[#17333d] font-aileron">{title}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 font-quicksand">
        {subtitle}
      </p>
      <ol className="mt-3 space-y-2.5">{children}</ol>
    </div>
  );
}

/** Step-by-step install + alert setup for iPhone (Safari PWA) and Android (Chrome). */
export function PhoneAlertsGuide() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other",
  );

  useEffect(() => {
    const ua = navigator.userAgent;
    if (isIosUserAgent(ua, navigator.maxTouchPoints ?? 0)) {
      setPlatform("ios");
      return;
    }
    if (/Android/i.test(ua)) setPlatform("android");
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-4 md:p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[#2a7797]" />
        <div>
          <h2 className="text-sm font-bold text-[#17333d] font-aileron">
            How to get lock-screen alerts
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 font-quicksand">
            Sign in first. Use the live dashboard (
            <span className="font-semibold text-slate-600">
              pgcv-bioinformatics-dashboard.vercel.app
            </span>
            ), not a computer localhost tab. After setup, review, approval, and
            incident notices can reach you when the dashboard is closed.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DeviceCard
          title="iPhone or iPad"
          subtitle="Safari · iOS 16.4 or later"
          highlight={platform === "ios"}
        >
          <Step n={1}>
            Open this dashboard in <strong className="font-bold text-slate-700">Safari</strong>.
            Chrome on iPhone cannot receive these alerts.
          </Step>
          <Step n={2}>Sign in with your lab Google account.</Step>
          <Step n={3}>
            Tap the <strong className="font-bold text-slate-700">Share</strong> button
            (square with an arrow). On iPhone it is usually at the bottom of
            Safari; on iPad it is in the toolbar.
          </Step>
          <Step n={4}>
            Scroll the share sheet and tap{" "}
            <strong className="font-bold text-slate-700">Add to Home Screen</strong>,
            then tap Add.
          </Step>
          <Step n={5}>
            Leave Safari. Open <strong className="font-bold text-slate-700">PGCV Dashboard</strong>{" "}
            from the new Home Screen icon. iPhone only sends push from that
            installed app, not from a Safari tab.
          </Step>
          <Step n={6}>
            Go to <strong className="font-bold text-slate-700">Notifications</strong>{" "}
            and tap <strong className="font-bold text-slate-700">Enable alerts</strong>,
            then Allow.
          </Step>
        </DeviceCard>

        <DeviceCard
          title="Android"
          subtitle="Chrome"
          highlight={platform === "android"}
        >
          <Step n={1}>
            Open this dashboard in <strong className="font-bold text-slate-700">Chrome</strong>.
          </Step>
          <Step n={2}>Sign in with your lab Google account.</Step>
          <Step n={3}>
            Go to <strong className="font-bold text-slate-700">Notifications</strong>{" "}
            and tap <strong className="font-bold text-slate-700">Enable alerts</strong>,
            then Allow.
          </Step>
          <Step n={4}>
            Optional but recommended: tap Chrome’s menu (three dots) →{" "}
            <strong className="font-bold text-slate-700">Add to Home screen</strong>{" "}
            or Install app, then open the icon next time.
          </Step>
        </DeviceCard>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
        <p className="text-xs font-bold text-slate-700 font-aileron">
          If you tapped Don’t Allow
        </p>
        <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-slate-600 font-quicksand">
          <li>
            <span className="font-semibold text-slate-700">iPhone:</span> Settings
            → Notifications → PGCV Dashboard → turn on Allow Notifications. Open
            the Home Screen app again (not Safari).
          </li>
          <li>
            <span className="font-semibold text-slate-700">Android:</span> Chrome
            menu → Settings → Site settings → Notifications, or phone Settings →
            Apps → Chrome → Notifications, then return here and tap Enable
            alerts.
          </li>
        </ul>
      </div>
    </section>
  );
}
