import { LoadingState } from "../../components/state-views";

export default function CalendarLoading() {
  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="animate-pulse space-y-2 flex-1">
          <div className="h-3 bg-slate-200/50 rounded w-1/4" />
          <div className="h-10 bg-slate-200/30 rounded w-1/3" />
          <div className="h-3 bg-slate-200/30 rounded w-1/2" />
        </div>
      </div>
      <div className="bg-surface border border-[rgba(23,33,38,0.06)] rounded-[24px] p-8 shadow-sm">
        <LoadingState message="Loading calendar…" />
      </div>
    </div>
  );
}
