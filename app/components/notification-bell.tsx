"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ExternalLink,
  CheckCheck,
  FileCheck2,
  BadgeCheck,
  Eye,
} from "lucide-react";
import {
  approveAnalysis,
  getMyNotifications,
  getReviewStatusLabel,
  getReviewUiState,
  markAllNotificationsRead,
  markNotificationRead,
  openReportForReview,
  subscribeToNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/supabase";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  useEffect(() => {
    getMyNotifications({ unreadOnly: true }).then(setNotifications);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, (n) => {
      setNotifications((prev) => [n, ...prev]);
    });
    return unsub;
  }, [userId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.length;

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications([]);
  }

  async function handleOpenReport(n: AppNotification) {
    const link = n.payload.service_report_link?.trim();
    if (!link) return;
    setBusyId(n.id);
    try {
      await openReportForReview(n);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id
            ? { ...item, submission_status: "Under review" }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
      window.open(link, "_blank", "noopener,noreferrer");
    }
  }

  async function handleApprove(n: AppNotification) {
    const analysisId = n.payload.analysis_id;
    if (!analysisId) return;
    setBusyId(n.id);
    try {
      await approveAnalysis(analysisId);
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-[#64748b] hover:bg-brand-tint hover:text-[#2a7797] transition-colors"
      >
        <Bell className="w-4 h-4 stroke-[2.5]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-11 right-0 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-[rgba(23,33,38,0.1)] rounded-2xl shadow-[0px_16px_40px_rgba(23,33,38,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-[12px] font-extrabold text-[#1e293b] uppercase tracking-wider font-quicksand">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1c5c59] transition-colors font-aileron"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Bell className="w-6 h-6 opacity-40" />
                <p className="text-[12px] font-bold font-aileron">All caught up</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isBusy = busyId === n.id;
                const reviewState = getReviewUiState(n.submission_status);
                const canApprove =
                  Boolean(n.payload.analysis_id) &&
                  (reviewState === "ready" || reviewState === "under_review");
                const StatusIcon =
                  reviewState === "under_review"
                    ? Eye
                    : reviewState === "approved" || reviewState === "submitted"
                      ? BadgeCheck
                      : FileCheck2;

                return (
                  <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                        <StatusIcon className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-extrabold text-[#1e293b] font-aileron leading-tight">
                          {getReviewStatusLabel(reviewState)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-aileron mt-0.5 truncate">
                          {n.payload.client_name ?? "—"}
                          {n.payload.service_report_number
                            ? ` · ${n.payload.service_report_number}`
                            : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {n.payload.service_report_link && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleOpenReport(n)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1c5c59] disabled:opacity-60 transition-colors font-aileron"
                            >
                              <ExternalLink className="w-3 h-3" /> Open Report
                            </button>
                          )}
                          {canApprove ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleApprove(n)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-60 transition-colors font-aileron"
                            >
                              <BadgeCheck className="w-3 h-3" /> Approve
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 font-aileron">
                              <BadgeCheck className="w-3 h-3" />{" "}
                              {getReviewStatusLabel(reviewState)}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleMarkRead(n.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 disabled:opacity-60 transition-colors font-aileron ml-auto"
                          >
                            <CheckCheck className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:text-[#1c5c59] transition-colors font-aileron"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
