import { Calendar, Info } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      {/* Top Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
          Dashboard - Calendar Page
        </span>
        <h1 className="text-4xl font-bold text-[#2a7797] tracking-tight">
          Calendar
        </h1>
      </div>

      {/* Coming Soon Notice Panel */}
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-[#fcb016]/10 flex items-center justify-center text-[#fcb016] mb-6 border border-[#fcb016]/20">
          <Calendar className="w-8 h-8" aria-hidden="true" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Calendar — Coming Soon
        </h2>

        <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-md mt-3 font-aileron">
          An integrated visual timeline view to aggregate your biweekly sprint
          objectives, upcoming internal training workshops, and project delivery
          dates into a single interactive node calendar.
        </p>

        {/* Helpful Context Note */}
        <div className="mt-8 max-w-md bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex gap-3 text-left items-start">
          <Info className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs">
            <span className="font-bold text-slate-700 block mb-0.5">Note:</span>
            <span className="text-slate-500 font-medium font-aileron leading-relaxed">
              Task due dates and project delivery timelines are currently tracked in
              their respective pages.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
