import { LoadingState } from "../../components/state-views";

export default function ServicesLoading() {
  return (
    <div className="space-y-8 mx-auto font-aileron max-w-[1240px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="animate-pulse space-y-2 flex-1">
          <div className="h-3 bg-slate-200/50 rounded w-1/4" />
          <div className="h-10 bg-slate-200/30 rounded w-1/2" />
          <div className="h-3 bg-slate-200/30 rounded w-2/3" />
        </div>
      </div>
      <div className="animate-pulse flex flex-wrap items-center gap-3 mb-8">
        <div className="h-10 bg-slate-200/30 rounded-xl w-28" />
        <div className="h-10 bg-slate-200/30 rounded-xl w-36" />
        <div className="h-10 bg-slate-200/30 rounded-xl w-32" />
      </div>
      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="animate-pulse flex items-center gap-2 mb-5">
          <div className="h-5 w-5 bg-slate-200/40 rounded" />
          <div className="h-6 bg-slate-200/40 rounded w-48" />
        </div>
        <LoadingState variant="skeleton" message="Loading services…" />
      </div>
    </div>
  );
}
