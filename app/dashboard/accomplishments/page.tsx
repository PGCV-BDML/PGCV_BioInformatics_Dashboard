"use client";

import { Award, Hourglass } from "lucide-react";

export default function AccomplishmentsComingSoonPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
          Dashboard - Accomplishments Page
        </span>
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Accomplishments
        </h1>
      </div>

      {/* Clean Slate Coming Soon */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-[#4ec2bb] mb-6 border border-teal-100">
          <Award className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Accomplishments — Coming Soon
        </h2>

        <p className="text-xs md:text-sm text-slate-500 font-medium max-w-sm mt-2 font-aileron">
          A designated repository wall to log published genome notes, resource
          generation trackers, and research highlights spearheaded by the team.
        </p>
      </div>
    </div>
  );
}
