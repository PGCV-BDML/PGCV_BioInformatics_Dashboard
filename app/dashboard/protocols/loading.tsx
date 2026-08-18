import { LoadingState } from "../../components/state-views";

export default function ProtocolsLoading() {
  return (
    <div className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-7 shadow-xl shadow-slate-400/20">
      <div className="animate-pulse space-y-3 mb-6">
        <div className="h-4 bg-slate-200/40 rounded w-40" />
        <div className="h-8 bg-slate-200/40 rounded w-2/3" />
        <div className="h-4 bg-slate-200/30 rounded w-5/6" />
      </div>
      <LoadingState variant="skeleton" message="Loading protocol…" />
    </div>
  );
}
