"use client";

import { Lock, Unlock } from "lucide-react";

/** Staff switch that opens or closes one module or presentation for trainees. */
export default function MaterialAccessToggle({
  title,
  isOpen,
  isSaving,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  isSaving: boolean;
  onToggle: () => void;
}) {
  const Icon = isOpen ? Unlock : Lock;
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${isOpen ? "text-[#359b95]" : "text-slate-400"}`}
      />
      <span className="text-[11px] font-bold text-slate-500">
        {isOpen ? "Open" : "Closed"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        aria-label={`${title} open for trainees`}
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

/** What a trainee sees in place of Open / View Materials while a row is closed. */
export function MaterialClosedBadge() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-4 py-2 bg-slate-100 text-slate-400 rounded-xl">
      <Lock className="w-3.5 h-3.5" />
      Not open yet
    </div>
  );
}
