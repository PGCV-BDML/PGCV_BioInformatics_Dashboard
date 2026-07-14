"use client";

export default function CalendarPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
          Dashboard - Services Page
        </span>
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Bioinformation Services
        </h1>
      </div>

      {/* Coming Soon Notice Panel */}
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Coming Soon
        </h2>

        <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-md mt-3 font-aileron"></p>
      </div>
    </div>
  );
}
