"use client";

import {
  FolderGit2,
  Network,
  FileCheck2,
  GraduationCap,
  Activity,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import type { DashboardStats } from "@/lib/mock-data";

export interface DashboardStatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  selectedYear: string;
}

export function DashboardStatsCards({
  stats,
  isLoading,
  selectedYear,
}: DashboardStatsCardsProps) {
  const totalProjects = stats
    ? stats.activeProjects + stats.completedProjects + stats.backlogProjects
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: Total Projects */}
      <div className="bg-[#eafafa] border border-teal-300/50 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(28,92,89,0.12)] flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between text-[#2e8b87] mb-1 font-quicksand">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Total Projects ({selectedYear})
            </span>
            <FolderGit2 className="w-4 h-4 opacity-80" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-4xl font-black text-[#1c5c59] tracking-tight font-aileron">
              {totalProjects}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-[rgba(78,194,187,0.25)] font-aileron">
          <span className="flex items-center gap-1 bg-[#d5f5f5] text-[#1c5c59] px-2 py-1 rounded-full">
            <Activity className="w-3 h-3" /> {stats?.activeProjects} Active
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-[#3ea39f] px-2 py-1 rounded-full border border-[rgba(78,194,187,0.25)]">
            <CheckCircle2 className="w-3 h-3" /> {stats?.completedProjects}{" "}
            Done
          </span>
        </div>
      </div>

      {/* Card 2: Collaborations */}
      <div className="bg-[#f3faf5] border border-emerald-300/50 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(6,78,59,0.1)] flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between text-emerald-700 mb-1 font-quicksand">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Collaborations
            </span>
            <Network className="w-4 h-4 opacity-80" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-4xl font-black text-emerald-900 tracking-tight font-aileron">
              {(stats?.activeCollaborations ?? 0) +
                (stats?.completedCollaborations ?? 0)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-emerald-200 font-aileron">
          <span className="flex items-center gap-1 bg-emerald-100/70 text-emerald-800 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {stats?.activeCollaborations} Active
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200/60">
            <CheckCircle2 className="w-3 h-3" />{" "}
            {stats?.completedCollaborations} Done
          </span>
        </div>
      </div>

      {/* Card 3: Service Reports */}
      <div className="bg-[#f0f4f8] border border-blue-200 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(23,78,100,0.1)] flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between text-[#2a7797] mb-1 font-quicksand">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Service Reports
            </span>
            <FileCheck2 className="w-4 h-4 opacity-80" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-4xl font-black text-[#174e64] tracking-tight font-aileron">
              {stats.reportsDelivered}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-slate-200/60 font-aileron">
          <span className="flex items-center gap-1 bg-[#e6f4f8] text-[#174e64] px-2 py-1 rounded-full">
            <ArrowUpRight className="w-3 h-3" /> +{stats?.reportsNew} New
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-[#356d83] px-2 py-1 rounded-full border border-slate-200/60">
            <FileCheck2 className="w-3 h-3" /> Historical
          </span>
        </div>
      </div>

      {/* Card 4: Programs Hub */}
      <div className="bg-[#fffbe6] border border-amber-300/60 rounded-[22px] p-6 shadow-[0_12px_28px_rgba(146,64,14,0.08)] flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between text-amber-800 mb-1 font-quicksand">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Programs Hub
            </span>
            <GraduationCap className="w-4 h-4 opacity-80" />
          </div>
          {isLoading || !stats ? (
            <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-4xl font-black text-amber-900 tracking-tight font-aileron">
              {stats.totalTrainings}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold pt-3 border-t border-amber-200 font-aileron">
          <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-full">
            <Activity className="w-3 h-3" /> {stats?.ongoingTrainings} Active
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-[#b58105] px-2 py-1 rounded-full border border-amber-200/60 font-aileron">
            <GraduationCap className="w-3 h-3" /> {stats?.totalInterns} Interns
          </span>
        </div>
      </div>
    </div>
  );
}
