"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ExternalLink, FileCheck2 } from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { EmptyState, ErrorState, LoadingState } from "../../components/state-views";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";
import { notificationsBreadcrumbs } from "@/lib/breadcrumbs";

type FilterMode = "unread" | "all";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("unread");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getMyNotifications({ unreadOnly: filter === "unread" });
        if (!cancelled) setNotifications(data);
      } catch (error) {
        console.error("Failed to load notifications:", error);
        if (!cancelled) {
          setLoadError("Couldn't load notifications.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    if (filter === "unread") {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    if (filter === "unread") {
      setNotifications([]);
      return;
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      <PageHeader
        breadcrumbTrail={notificationsBreadcrumbs}
        title="Notifications"
        subtitle="Review-ready reports and other alerts for approving officers"
        actions={
          <>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-surface p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  filter === "unread"
                    ? "bg-[#2a7797] text-white"
                    : "text-slate-600 hover:text-[#2a7797]"
                }`}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  filter === "all"
                    ? "bg-[#2a7797] text-white"
                    : "text-slate-600 hover:text-[#2a7797]"
                }`}
              >
                All
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </>
        }
      />

      {loadError ? (
        <ErrorState message={loadError} />
      ) : isLoading ? (
        <LoadingState message="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description="Completed analyses with a report link and assigned approving officer will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-[22px] border p-5 shadow-[0_10px_24px_rgba(23,33,38,0.06)] ${
                notification.is_read
                  ? "border-slate-200 bg-slate-50/70"
                  : "border-emerald-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <FileCheck2 className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold uppercase tracking-wider text-emerald-700 font-quicksand">
                      Ready for review
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900 truncate">
                      {notification.payload.client_name || "Unnamed analysis"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {notification.payload.service_report_number
                        ? `Service report ${notification.payload.service_report_number}`
                        : "Service report link available"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Notified {formatTimestamp(notification.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {notification.payload.service_report_link && (
                    <a
                      href={notification.payload.service_report_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Report
                    </a>
                  )}
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(notification.id)}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-full transition-all whitespace-nowrap"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
