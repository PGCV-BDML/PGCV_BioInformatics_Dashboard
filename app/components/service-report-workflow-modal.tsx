"use client";

import { useEffect, useState } from "react";
import { Info, X, Lightbulb } from "lucide-react";

type WorkflowStep = {
  title: string;
  actor: string;
  detail: string;
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: "Create the record",
    actor: "Analyst",
    detail:
      "Click Add Analysis. The Service Report Number fills in automatically. Set an Assignee so the work shows up on the Tasks board — new records start as On-going.",
  },
  {
    title: "Run the analysis",
    actor: "Analyst",
    detail:
      "Keep Status of Completion current as you go. Use On hold (for payment) when work pauses, Cancelled to drop it from the Tasks board.",
  },
  {
    title: "Mark it Completed",
    actor: "Analyst",
    detail:
      "Set Status of Completion to Completed. This timestamps the record and unlocks the report step.",
  },
  {
    title: "Attach the report link",
    actor: "Analyst",
    detail:
      "Click Generate in the Service Report Link column to log who delivered it and when, or paste the URL straight into the edit panel.",
  },
  {
    title: "Assign the Approving Officer",
    actor: "Analyst",
    detail:
      "Open the edit panel and pick the officer under Personnel. Saving this sends the notification. Only team leads appear in the list.",
  },
  {
    title: "Review and approve",
    actor: "Approving officer",
    detail:
      "The officer opens the bell icon or the Notifications page. Open Report sets the record to Under review; Approve sets it to Approved and stamps a note on the record.",
  },
  {
    title: "Submit and close out",
    actor: "Analyst",
    detail:
      "Once the approved report has gone to the client, set Status of Submission to Submitted. Mark it acknowledged from the record's detail page when the client confirms receipt.",
  },
];

export function ServiceReportWorkflowModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-guide-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-[24px] max-w-[620px] w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-1.5 w-full bg-[#4ec2bb] shrink-0" />

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3
              id="workflow-guide-title"
              className="text-lg font-bold text-[#2a7797] tracking-tight"
            >
              How a service report moves
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              From intake to client delivery, including sign-off
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          <ol className="space-y-4">
            {WORKFLOW_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#e6f4f8] text-[#2a7797] text-[11px] font-extrabold">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[13px] font-bold text-slate-800">
                      {step.title}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                      {step.actor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">
                The officer is notified on an edit, not on creation.
              </span>{" "}
              The alert fires the moment a saved record <em>becomes</em> Completed
              + linked + assigned an officer. If you fill in all three while first
              creating the record, no alert goes out — clear the Approving Officer,
              save, then set it again and save.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-md transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small "i" affordance that opens the workflow walkthrough. */
export function ServiceReportWorkflowInfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="How a service report moves through the tracker"
        title="How a service report moves through the tracker"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-[#2a7797] hover:bg-[#e6f4f8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ec2bb]"
      >
        <Info className="w-4 h-4" />
      </button>
      <ServiceReportWorkflowModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
