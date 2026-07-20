import { Calendar, Hourglass } from "lucide-react";

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
      <div className="bg-[#fffdf8] border border-[rgba(23,33,38,0.06)] rounded-[24px] p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 border border-amber-100">
          <Calendar className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Calendar — Coming Soon
        </h2>

        <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed max-w-md mt-3 font-aileron">
          An integrated visual timeline view to aggregate your biweekly sprint
          objectives, upcoming internal training workshops, and project delivery
          dates into a single interactive node calendar.
        </p>
      </div>
    </div>
  );
}
