"use client";

import { Lock, Unlock } from "lucide-react";
import type { Assessment } from "@/types/database";

/** Staff switch that opens or closes a pre-test, post-test or evaluation. */
export default function AssessmentAccessToggle({
  title,
  assessment,
  isSaving,
  onToggle,
}: {
  title: string;
  assessment: Assessment;
  isSaving: boolean;
  onToggle: () => void;
}) {
  const isOpen = assessment.is_open ?? true;
  const Icon = isOpen ? Unlock : Lock;
  return (
    <div className="flex items-center justify-between gap-3 bg-white/80 border border-slate-200/80 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className={`w-4 h-4 shrink-0 ${isOpen ? "text-[#359b95]" : "text-slate-400"}`}
        />
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-700">{title}</p>
          <p className="text-[11px] text-slate-500">
            {isOpen
              ? "Open: participants can submit"
              : "Closed: participants can't start it yet"}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        aria-label={`${title} open for submissions`}
        disabled={isSaving}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          isOpen ? "bg-[#4ec2bb]" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isOpen ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
