import { LoadingState } from "../../components/state-views";

export default function ForumLoading() {
  return (
    <div className="space-y-8 mx-auto font-aileron max-w-[1240px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="animate-pulse space-y-2 flex-1">
          <div className="h-3 bg-slate-200/50 rounded w-1/4" />
          <div className="h-10 bg-slate-200/30 rounded w-1/2" />
          <div className="h-3 bg-slate-200/30 rounded w-2/3" />
        </div>
      </div>
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <LoadingState variant="skeleton" message="Loading Forum…" />
      </div>
    </div>
  );
}
