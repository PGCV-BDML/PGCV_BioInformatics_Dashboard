"use client";

import {
  moduleStatus,
  type ChecklistKind,
  type ModuleStatus,
  type ProgressSummary,
} from "@/lib/module-progress";

/** A program module that reports checklist or test progress. */
export type ProgressModule = {
  id: string;
  title: string;
  /** Short name for headers and chips, e.g. "Pre-test". */
  label: string;
  checklistKind: ChecklistKind;
};

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  complete: "Complete",
  submitted: "Submitted",
  in_progress: "In progress",
  not_started: "Not started",
};

const SEGMENT_CLASS: Record<ModuleStatus, string> = {
  complete: "bg-emerald-500 border-emerald-600/30",
  submitted: "bg-[#4f9fbf] border-[#1f5f79]/30",
  in_progress: "bg-amber-400 border-amber-500/40",
  not_started: "bg-slate-100 border-slate-300",
};

const PILL_CLASS: Record<ModuleStatus, string> = {
  complete: "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100",
  submitted: "bg-[#e7f3f6] text-[#1f5f79] border-[#c5e0e8] hover:bg-[#d7ebf1]",
  in_progress: "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100",
  not_started: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
};

/** "12 / 12" for steps or a score, "—" for a test not yet submitted. */
export function progressCount(
  summary: ProgressSummary | undefined,
  module: ProgressModule,
): string {
  if (!summary) return "—";
  if (module.checklistKind === "quiz" && moduleStatus(summary, "quiz") === "not_started") {
    return "—";
  }
  return `${summary.done} / ${summary.total}`;
}

function segmentTitle(module: ProgressModule, summary: ProgressSummary | undefined): string {
  const status = moduleStatus(summary, module.checklistKind);
  const count = progressCount(summary, module);
  return `${module.title} · ${MODULE_STATUS_LABEL[status]}${count === "—" ? "" : ` · ${count}`}`;
}

/** The count pill for one module. Clicking it opens that module's detail. */
export function ModuleProgressPill({
  module,
  summary,
  onClick,
}: {
  module: ProgressModule;
  summary: ProgressSummary | undefined;
  onClick: () => void;
}) {
  if (!summary) return <span className="text-slate-400">—</span>;
  const status = moduleStatus(summary, module.checklistKind);
  return (
    <button
      type="button"
      onClick={onClick}
      title={segmentTitle(module, summary)}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold font-mono transition-colors ${PILL_CLASS[status]}`}
    >
      {progressCount(summary, module)}
    </button>
  );
}

/**
 * One segment per module, so the column stays the same width however many
 * modules a program has. Each segment opens that module's detail.
 */
export default function ModuleProgressStrip({
  modules,
  setup,
  participantName,
  onSelect,
}: {
  modules: ProgressModule[];
  setup: Record<string, ProgressSummary>;
  participantName: string;
  onSelect: (module: ProgressModule) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`${participantName} module progress`}
      className="flex flex-wrap gap-1"
    >
      {modules.map((module) => {
        const summary = setup[module.id];
        const status = moduleStatus(summary, module.checklistKind);
        const title = segmentTitle(module, summary);
        return (
          <button
            key={module.id}
            type="button"
            title={title}
            aria-label={title}
            disabled={!summary}
            onClick={() => onSelect(module)}
            className={`h-3.5 w-3.5 rounded-[4px] border transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2a7797] disabled:pointer-events-none ${SEGMENT_CLASS[status]}`}
          />
        );
      })}
    </div>
  );
}
