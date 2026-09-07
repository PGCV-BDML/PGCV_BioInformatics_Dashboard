"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ExternalLink } from "lucide-react";
import { TaskCategoryChips as CategoryChips } from "./category-chips";
import { usePortal } from "./portal-context";
import {
  comingUpKindLabel,
  comingUpWhenLabel,
  getMyComingUpTasks,
  type ComingUpReminder,
} from "@/lib/task-reminders";

export function ComingUpList({
  items,
  isLoading,
  error,
}: {
  items: ComingUpReminder[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-[#2a7797] font-quicksand">
        <Calendar className="w-4 h-4" />
        <h2 className="text-xs font-extrabold uppercase tracking-wider">
          Coming up
        </h2>
      </div>

      {isLoading ? (
        <div
          className="space-y-3"
          role="status"
          aria-label="Loading upcoming dates"
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
          No tours, events, meetings, or training today or tomorrow.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => {
            const isToday = item.when === "today";
            return (
              <div
                key={item.id}
                className={`rounded-[22px] border p-5 shadow-[0_10px_24px_rgba(23,33,38,0.06)] ${
                  isToday
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-sky-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        isToday ? "bg-amber-100" : "bg-sky-100"
                      }`}
                    >
                      <Calendar
                        className={`h-4 w-4 ${
                          isToday ? "text-amber-800" : "text-sky-800"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider font-quicksand ${
                          isToday
                            ? "bg-amber-100 text-amber-900"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {comingUpWhenLabel(item.when)}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-slate-900 truncate">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.dateLabel || comingUpKindLabel(item.showUpCategories)}
                      </p>
                      <CategoryChips
                        categories={item.showUpCategories}
                        maxVisible={4}
                        className="mt-2"
                      />
                      {item.details ? (
                        <p className="mt-2 text-sm text-slate-500 font-aileron line-clamp-2">
                          {item.details}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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

export function ComingUpReminders() {
  const { profile, loading: portalLoading } = usePortal();
  const [items, setItems] = useState<ComingUpReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const data = await getMyComingUpTasks(userId);
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error("Failed to load upcoming reminders:", err);
        if (!cancelled) {
          setError("Couldn't load upcoming dates.");
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

  return (
    <ComingUpList items={items} isLoading={isLoading} error={error} />
  );
}
