"use client";

import { useEffect } from "react";
import { ClipboardCheck, ListChecks, X } from "lucide-react";
import {
  moduleStatus,
  overallProgress,
  type ProgressSummary,
} from "@/lib/module-progress";
import {
  MODULE_STATUS_LABEL,
  ModuleProgressPill,
  type ProgressModule,
} from "@/app/components/module-progress-strip";

function lastUpdated(summary: ProgressSummary | undefined): string {
  const stamps = (summary?.items ?? [])
    .map((item) => item.updated_at || item.completed_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latest = stamps.at(-1);
  if (!latest) return "";
  const date = new Date(latest);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Every module for one learner, listed down a side panel. */
export default function ParticipantProgressDrawer({
  isOpen,
  participantName,
  email,
  modules,
  setup,
  onSelectModule,
  onClose,
}: {
  isOpen: boolean;
  participantName: string;
  email: string;
  modules: ProgressModule[];
  setup: Record<string, ProgressSummary>;
  onSelectModule: (module: ProgressModule) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overall = overallProgress(setup, modules);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="participant-progress-title"
        className="h-full w-full max-w-[420px] bg-surface shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <h4
              id="participant-progress-title"
              className="text-lg font-bold text-slate-800 leading-snug"
            >
              {participantName}
            </h4>
            <p className="text-[11px] font-mono text-slate-400 truncate">{email}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {overall.finished} of {overall.total} modules finished
              {overall.started > 0 && ` · ${overall.started} in progress`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="flex-1 overflow-y-auto p-3 space-y-1">
          {modules.map((module) => {
            const summary = setup[module.id];
            const status = moduleStatus(summary, module.checklistKind);
            const when = lastUpdated(summary);
            const Icon = module.checklistKind === "quiz" ? ClipboardCheck : ListChecks;
            return (
              <li
                key={module.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50"
              >
                <Icon className="w-4 h-4 shrink-0 text-[#2a7797]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {module.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {MODULE_STATUS_LABEL[status]}
                    {when && ` · ${when}`}
                  </p>
                </div>
                <ModuleProgressPill
                  module={module}
                  summary={summary}
                  onClick={() => onSelectModule(module)}
                />
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
