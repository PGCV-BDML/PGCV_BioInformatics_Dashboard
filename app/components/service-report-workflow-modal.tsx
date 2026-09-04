"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, X, Lightbulb, ArrowRight } from "lucide-react";
import { routes } from "@/lib/routes";

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
      "Set Status of Completion to Completed. This timestamps the record and unlocks the report upload.",
  },
  {
    title: "Upload the PDF",
    actor: "Analyst",
    detail:
      "Click Upload in the Service Report column and attach the PDF. After it is stored, the eye previews it in the dashboard and the download button saves a copy. Optionally stamp your e-signature under Prepared by — drag or resize it on the last page, the same way reviewing and approving officers do. You can add a Drive or share link alongside it. The PDF is what goes through review.",
  },
  {
    title: "Assign the Reviewing Officer",
    actor: "Analyst",
    detail:
      "Open the edit panel and pick a reviewing officer under Personnel. Reviewing officers and team leads are listed, and the reviewer cannot be the assignee. Saving with a completed report notifies them.",
  },
  {
    title: "Peer review",
    actor: "Reviewing officer",
    detail:
      "From the bell or Notifications page, Open Report marks it In review. Complete review opens a last-page preview of your e-signature under Reviewed by — drag or resize it if needed, then confirm to stamp and sign the report off. Request revision sends it back to the assignee with comments. Upload your signature first under the profile menu → My signature.",
  },
  {
    title: "Assign the Approving Officer",
    actor: "Analyst",
    detail:
      "Pick an approving officer under Approving Officer. Only accounts with that role are listed. They are notified only after Status of Review is Reviewed — never before.",
  },
  {
    title: "Approve or request changes",
    actor: "Approving officer",
    detail:
      "Open Report sets Status of Submission to Under review. Approve opens a last-page preview of your e-signature under Approved for Release — check it against the reviewer stamp already on the page, drag or resize yours if needed, then confirm. Request changes sends comments back to the assignee. If they upload a new PDF, it goes back to the reviewing officer to sign again before it returns here.",
  },
  {
    title: "Address comments and resubmit",
    actor: "Analyst",
    detail:
      "Revision or change-request comments land in the assignee's bell and on the detail page. Fix them, then Resubmit for review or Resubmit for approval. Uploading a new PDF version after peer review notifies the reviewing officer again — they must sign the new file before approval can continue. Previous versions stay on the record.",
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
                Approving officers are never notified before peer review is done.
              </span>{" "}
              Status of Review must be Reviewed first. The reviewing officer and
              approving officer must also be different people, and the reviewer
              cannot be the assignee.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <Link
            href={routes.protocols.detail("service-report-tracker")}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-[#2a7797] hover:text-[#236584] text-xs font-bold"
          >
            Read the full protocol
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
