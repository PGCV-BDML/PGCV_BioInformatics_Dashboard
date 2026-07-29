"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ExternalLink, CheckCheck, FileCheck2 } from "lucide-react";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/supabase";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load current user id once
  useEffect(() => {
    getCurrentUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  // Initial fetch
  useEffect(() => {
    getMyNotifications({ unreadOnly: true }).then(setNotifications);
  }, []);

  // Realtime subscription — only when we have a userId
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, (n) => {
      setNotifications((prev) => [n, ...prev]);
    });
    return unsub;
  }, [userId]);

  // Close on outside click
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
    await markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications([]);
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
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-[12px] font-extrabold text-[#1e293b] uppercase tracking-wider font-quicksand">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1c5c59] transition-colors font-aileron"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Bell className="w-6 h-6 opacity-40" />
                <p className="text-[12px] font-bold font-aileron">All caught up</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold text-[#1e293b] font-aileron leading-tight">
                        Analysis ready for review
                      </p>
                      <p className="text-[11px] text-slate-500 font-aileron mt-0.5 truncate">
                        {n.payload.client_name ?? "—"}
                        {n.payload.service_report_number
                          ? ` · ${n.payload.service_report_number}`
                          : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {n.payload.service_report_link && (
                          <a
                            href={n.payload.service_report_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1c5c59] transition-colors font-aileron"
                          >
                            <ExternalLink className="w-3 h-3" /> Open Report
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors font-aileron ml-auto"
                        >
                          <CheckCheck className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
