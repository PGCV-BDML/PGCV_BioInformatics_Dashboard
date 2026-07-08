"use client";

import { Link2, Info } from "lucide-react";

export default function RepositoriesComingSoonPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
          Dashboard - List
        </span>
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Source Repositories
        </h1>
      </div>

      {/* Main Skeleton Box */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100">
          <Link2 className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Repositories — Coming Soon
        </h2>

        <p className="text-xs md:text-sm text-slate-500 font-medium max-w-sm mt-2 font-aileron">
          A centralized control room module to index code pipelines across
          various user projects.
        </p>

        {/* Structural Reminder Callout Note */}
        <div className="mt-8 max-w-md bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex gap-3 text-left items-start">
          <Info className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-slate-700 block mb-0.5">Note:</span>
            <span className="text-slate-500 font-medium font-aileron leading-relaxed">
              Repository links live inside Projects and Collaborations.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
