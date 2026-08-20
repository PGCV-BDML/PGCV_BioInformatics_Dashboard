"use client";

import {
  Activity,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";
import type { AnalysisDashboardStats } from "@/lib/analysis-dashboard-stats";

export interface AnalysisDashboardStatCardsProps {
  stats: AnalysisDashboardStats | null;
  isLoading: boolean;
  selectedYear: string;
}

export function AnalysisDashboardStatCards({
  stats,
  isLoading,
  selectedYear,
}: AnalysisDashboardStatCardsProps) {
  const total = stats?.total ?? 0;
  const completedPct =
    total > 0 ? Math.round(((stats?.completed ?? 0) / total) * 100) : 0;

  const ongoingCount = stats?.ongoing ?? 0;
  const onHoldCount = stats?.onHold ?? 0;
  const ongoingIsZero = ongoingCount === 0;
  const onHoldIsZero = onHoldCount === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Completed */}
      <div className="bg-[#f3faf5] border border-emerald-300/50 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(6,78,59,0.1)] flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between text-emerald-700 mb-1 font-quicksand">
            <div className="min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                Completed
              </span>
              <span className="block text-[10px] font-bold normal-case tracking-normal text-emerald-700/70 mt-0.5">
                Service reports · {selectedYear}
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 opacity-80 shrink-0" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="space-y-3">
              <div className="text-4xl font-black text-emerald-900 tracking-tight font-aileron">
                {stats.completed}
              </div>
              <div className="h-2 bg-emerald-100/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${completedPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-emerald-200 font-aileron">
          <span className="flex items-center gap-1 bg-emerald-100/70 text-emerald-800 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> {completedPct}%
          </span>
        </div>
      </div>

      {/* Ongoing */}
      <div
        className={`bg-[#fffbe6] border border-amber-300/60 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(146,64,14,0.08)] flex flex-col justify-between gap-4 ${
          ongoingIsZero ? "opacity-60" : ""
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-amber-800 mb-1 font-quicksand">
            <div className="min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                Ongoing
              </span>
              <span className="block text-[10px] font-bold normal-case tracking-normal text-amber-800/70 mt-0.5">
                Service reports · {selectedYear}
              </span>
            </div>
            <Activity className="w-4 h-4 opacity-80 shrink-0" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-4xl font-black text-amber-900 tracking-tight font-aileron">
              {ongoingCount}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-amber-200 font-aileron">
          <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-full">
            <Activity className="w-3 h-3" />{" "}
            {ongoingIsZero ? "None" : "In progress"}
          </span>
        </div>
      </div>

      {/* On Hold */}
      <div
        className={`bg-[#fffbe6] border border-amber-300/60 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(146,64,14,0.08)] flex flex-col justify-between gap-4 ${
          onHoldIsZero ? "opacity-60" : ""
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-amber-800 mb-1 font-quicksand">
            <div className="min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                On Hold
              </span>
              <span className="block text-[10px] font-bold normal-case tracking-normal text-amber-800/70 mt-0.5">
                Service reports · {selectedYear}
              </span>
            </div>
            <PauseCircle className="w-4 h-4 opacity-80 shrink-0" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-4xl font-black text-amber-900 tracking-tight font-aileron">
              {onHoldCount}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-amber-200 font-aileron">
          <span className="flex items-center gap-1 bg-white/60 text-[#b58105] px-2 py-1 rounded-full border border-amber-200/60">
            <PauseCircle className="w-3 h-3" /> {onHoldIsZero ? "None" : "Paused"}
          </span>
        </div>
      </div>
    </div>
  );
}
