"use client";

import Link from "next/link";
import { ExternalLink, MessageSquareWarning, X } from "lucide-react";
import ReviewCommentsPanel from "./review-comments-panel";
import ServiceReportReplace from "./service-report-replace";
import ServiceReportVersions from "./service-report-versions";
import {
  isChangesRequestedLabel,
  isRevisionRequestedLabel,
} from "@/lib/analysis-tracker";
import { routes } from "@/lib/routes";

export type ReviewCommentsModalRow = {
  id: string;
  label: string;
  status_of_review: string;
  status_of_submission: string;
  service_report_file_path: string;
  service_report_file_name: string;
};

interface ReviewCommentsModalProps {
  row: ReviewCommentsModalRow | null;
  onClose: () => void;
  onResubmitted?: (stage: "review" | "approval") => void;
  onPdfReplaced?: (next: {
    path: string;
    name: string;
    statusOfReview: string | null;
    notes: string | null;
  }) => void;
  readOnly?: boolean;
}

export default function ReviewCommentsModal({
  row,
  onClose,
  onResubmitted,
  onPdfReplaced,
  readOnly = false,
}: ReviewCommentsModalProps) {
  if (!row) return null;

  const awaitingSendBack =
    isRevisionRequestedLabel(row.status_of_review) ||
    isChangesRequestedLabel(row.status_of_submission);

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-comments-modal-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="review-comments-modal-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-1.5"
            >
              <MessageSquareWarning
                className={`w-4 h-4 shrink-0 ${
                  awaitingSendBack ? "text-amber-600" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              Review Comments
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 truncate">{row.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ReviewCommentsPanel
          analysisId={row.id}
          statusOfReview={row.status_of_review}
          statusOfSubmission={row.status_of_submission}
          currentFilePath={row.service_report_file_path}
          forceVisible
          bare
          readOnly={readOnly}
        />

        {awaitingSendBack && !readOnly ? (
          <ServiceReportReplace
            analysisId={row.id}
            filePath={row.service_report_file_path}
            statusOfReview={row.status_of_review}
            statusOfSubmission={row.status_of_submission}
            enabled
            onReplaced={(next) => onPdfReplaced?.(next)}
            onResubmitted={onResubmitted}
          />
        ) : null}

        <ServiceReportVersions
          analysisId={row.id}
          currentPath={row.service_report_file_path}
        />

        <Link
          href={routes.services.detail(row.id)}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2a7797] hover:text-[#1f5c76] underline decoration-dotted"
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          Open full record
        </Link>
      </div>
    </div>
  );
}
