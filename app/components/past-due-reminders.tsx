"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, ExternalLink } from "lucide-react";
import { TaskCategoryChips as CategoryChips } from "./category-chips";
import { usePortal } from "./portal-context";
import {
  getMyPastDueTasks,
  markReminderTaskCompleted,
  onTaskCompleted,
  pastDueAgoLabel,
  type PastDueReminder,
} from "@/lib/task-reminders";
import {
  getMyNotifications,
  isTaskPastDueNotification,
  markNotificationRead,
} from "@/lib/notifications";

export function PastDueList({
  items,
  isLoading,
  error,
  onMarkComplete,
  busyId,
}: {
  items: PastDueReminder[];
  isLoading: boolean;
  error: string | null;
  onMarkComplete: (taskId: string) => void;
  busyId: string | null;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-[#2a7797] font-quicksand">
        <Clock className="w-4 h-4" />
        <h2 className="text-xs font-extrabold uppercase tracking-wider">
          Past due
        </h2>
      </div>

      {isLoading ? (
        <div
          className="space-y-3"
          role="status"
          aria-label="Loading past-due tasks"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[88px] rounded-[22px] bg-slate-100/70 border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 font-aileron" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 font-aileron">
          No open tasks are past due.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => {
            const isBusy = busyId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-[22px] border border-rose-200 bg-rose-50/40 p-5 shadow-[0_10px_24px_rgba(23,33,38,0.06)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                      <Clock className="h-4 w-4 text-rose-800" />
                    </div>
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider font-quicksand text-rose-900">
                        Past due
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-slate-900 truncate">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {pastDueAgoLabel(item.daysOverdue)}. Is this task
                        completed already?
                      </p>
                      {item.dateLabel ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {item.dateLabel}
                        </p>
                      ) : null}
                      {item.categories.length > 0 ? (
                        <CategoryChips
                          categories={item.categories}
                          maxVisible={4}
                          className="mt-2"
                        />
                      ) : null}
                      {item.details ? (
                        <p className="mt-2 text-sm text-slate-500 font-aileron line-clamp-2">
                          {item.details}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onMarkComplete(item.id)}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Yes, mark complete
                    </button>
                    <Link
                      href={item.href}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open task
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function PastDueReminders() {
  const { profile, loading: portalLoading } = usePortal();
  const [items, setItems] = useState<PastDueReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (portalLoading) return;
    const userId = profile?.id?.trim() ?? "";
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMyPastDueTasks(userId);
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error("Failed to load past-due reminders:", err);
        if (!cancelled) {
          setError("Couldn't load past-due tasks.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [portalLoading, profile?.id]);

  useEffect(() => {
    return onTaskCompleted((taskId) => {
      setItems((prev) => prev.filter((item) => item.id !== taskId));
    });
  }, []);

  async function handleMarkComplete(taskId: string) {
    setBusyId(taskId);
    setError(null);
    try {
      await markReminderTaskCompleted(taskId);
      setItems((prev) => prev.filter((item) => item.id !== taskId));
      const notes = await getMyNotifications({ unreadOnly: true });
      await Promise.all(
        notes
          .filter(
            (n) =>
              isTaskPastDueNotification(n) && n.payload.task_id === taskId,
          )
          .map((n) => markNotificationRead(n.id)),
      );
    } catch (err) {
      console.error("Failed to mark task complete:", err);
      setError("Couldn't mark that task complete. Try opening it instead.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PastDueList
      items={items}
      isLoading={isLoading}
      error={error}
      onMarkComplete={(taskId) => void handleMarkComplete(taskId)}
      busyId={busyId}
    />
  );
}
