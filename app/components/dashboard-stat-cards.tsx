"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  FileCheck2,
  GraduationCap,
  Briefcase,
  Activity,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import type { DashboardStats } from "@/lib/dashboard-stats";
import { formatAnalysisYearLabel } from "@/lib/analysis-dashboard-stats";

export interface DashboardStatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  selectedYear: string;
}

type StatCard = {
  href: string;
  label: string;
  icon: ReactNode;
  value: number | null;
  tone: {
    card: string;
    label: string;
    value: string;
    border: string;
  };
  footnotes: ReactNode;
};

export function DashboardStatsCards({
  stats,
  isLoading,
  selectedYear,
}: DashboardStatsCardsProps) {
  const yearLabel = formatAnalysisYearLabel(selectedYear);
  const cards: StatCard[] = [
    {
      href: "/dashboard/services",
      label: `Service Reports Generated (${yearLabel})`,
      icon: <FileCheck2 className="w-4 h-4 opacity-80" />,
      value: stats?.reportsGenerated ?? null,
      tone: {
        card: "bg-[#f0f4f8] border-blue-200 shadow-[0_12px_28px_rgba(23,78,100,0.1)]",
        label: "text-[#2a7797]",
        value: "text-[#174e64]",
        border: "border-slate-200/60",
      },
      footnotes: (
        <>
          <span className="flex items-center gap-1 bg-[#e6f4f8] text-[#174e64] px-2 py-1 rounded-full">
            <FileCheck2 className="w-3 h-3" /> With SR#
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-[#356d83] px-2 py-1 rounded-full border border-slate-200/60">
            <ArrowUpRight className="w-3 h-3" /> {stats?.reportsPending ?? 0} Pending
          </span>
        </>
      ),
    },
    {
      href: "/dashboard/training",
      label: `Trainings Conducted (${yearLabel})`,
      icon: <GraduationCap className="w-4 h-4 opacity-80" />,
      value: stats?.totalTrainings ?? null,
      tone: {
        card: "bg-[#fffbe6] border-amber-300/60 shadow-[0_12px_28px_rgba(146,64,14,0.08)]",
        label: "text-amber-800",
        value: "text-amber-900",
        border: "border-amber-200",
      },
      footnotes: (
        <>
          <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-full">
            <Activity className="w-3 h-3" /> {stats?.ongoingTrainings ?? 0} Ongoing
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-[#b58105] px-2 py-1 rounded-full border border-amber-200/60">
            <CheckCircle2 className="w-3 h-3" /> {stats?.completedTrainings ?? 0} Done
          </span>
        </>
      ),
    },
    {
      href: "/dashboard/internship",
      label: `Internship Programs (${yearLabel})`,
      icon: <Briefcase className="w-4 h-4 opacity-80" />,
      value: stats?.totalInternPrograms ?? null,
      tone: {
        card: "bg-[#faf5ff] border-violet-200/70 shadow-[0_12px_28px_rgba(91,33,182,0.08)]",
        label: "text-violet-800",
        value: "text-violet-950",
        border: "border-violet-200/70",
      },
      footnotes: (
        <>
          <span className="flex items-center gap-1 bg-violet-100/80 text-violet-900 px-2 py-1 rounded-full">
            <Activity className="w-3 h-3" /> {stats?.ongoingInternPrograms ?? 0} Active
          </span>
          <span className="flex items-center gap-1 bg-white/60 text-violet-700 px-2 py-1 rounded-full border border-violet-200/60">
            <Briefcase className="w-3 h-3" /> Programs
          </span>
        </>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {cards.map((card) => (
        <Link
          key={card.href + card.label}
          href={card.href}
          className={`group border rounded-[22px] p-6 flex flex-col justify-between gap-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a7797]/40 ${card.tone.card}`}
        >
          <div>
            <div
              className={`flex items-center justify-between mb-1 font-quicksand ${card.tone.label}`}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider leading-snug pr-2">
                {card.label}
              </span>
              {card.icon}
            </div>
            {isLoading || card.value === null ? (
              <div className="h-10 w-20 bg-slate-300/40 animate-pulse rounded-lg mt-1" />
            ) : (
              <div
                className={`text-4xl font-black tracking-tight font-aileron ${card.tone.value}`}
              >
                {card.value}
              </div>
            )}
          </div>
          <div
            className={`flex flex-wrap items-center gap-2 text-[11px] font-bold pt-3 border-t font-aileron ${card.tone.border}`}
          >
            {card.footnotes}
          </div>
        </Link>
      ))}
    </div>
  );
}
