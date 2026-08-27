"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, MessageSquareWarning, Send } from "lucide-react";
import {
  getReviewComments,
  resubmitForApproval,
  resubmitForReview,
  type ReviewCommentWithAuthor,
} from "@/lib/notifications";
import {
  isChangesRequestedLabel,
  isRevisionRequestedLabel,
  needsReReviewAfterPdfReplace,
} from "@/lib/analysis-tracker";
import { getServiceReportSignedUrl } from "@/lib/service-report-file";
import { useToast } from "./toast";

interface ReviewCommentsPanelProps {
  analysisId: string;
  statusOfReview: string | null;
  statusOfSubmission: string | null;
  /** Current PDF path — hide the comment's file link when it still matches. */
  currentFilePath?: string | null;
  /** Called after a successful resubmission so the parent can refresh status. */
  onResubmitted?: (stage: "review" | "approval") => void;
  /**
   * When true, render an empty state instead of hiding the panel.
   * Used in the tracker modal where the column always opens this UI.
   */
  forceVisible?: boolean;
  /** Drop the outer card chrome when the parent already provides a shell. */
  bare?: boolean;
  /** Hide resubmit; reviewing officers browse comments from the tracker. */
  readOnly?: boolean;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function commentedPdfPath(
  comment: ReviewCommentWithAuthor,
  currentFilePath: string | null,
): string | null {
  const path = comment.file_path?.trim() ?? "";
  if (!path || path === (currentFilePath ?? "").trim()) return null;
  return path;
}

export default function ReviewCommentsPanel({
  analysisId,
  statusOfReview,
  statusOfSubmission,
  currentFilePath = null,
  onResubmitted,
  forceVisible = false,
  bare = false,
  readOnly = false,
}: ReviewCommentsPanelProps) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<ReviewCommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await getReviewComments(analysisId);
    setComments(rows);
    setIsLoading(false);
  }, [analysisId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const rows = await getReviewComments(analysisId);
      if (cancelled) return;
      setComments(rows);
      setIsLoading(false);
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const awaitingRevision = isRevisionRequestedLabel(statusOfReview);
  const awaitingChanges = isChangesRequestedLabel(statusOfSubmission);
  const waitingOnReReview = needsReReviewAfterPdfReplace(
    statusOfReview,
    statusOfSubmission,
  );
  const awaitingSendBack = awaitingRevision || awaitingChanges;
  const canResubmit = awaitingRevision || (awaitingChanges && !waitingOnReReview);

  async function openCommentedPdf(path: string, fileName: string | null) {
    const url = await getServiceReportSignedUrl(path, fileName);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      showToast("Couldn't open that PDF.", "error");
    }
  }

  async function handleResubmit() {
    if (isResubmitting) return;
    setIsResubmitting(true);
    setError(null);
    try {
      if (awaitingRevision) {
        await resubmitForReview(analysisId);
        await load();
        onResubmitted?.("review");
      } else {
        await resubmitForApproval(analysisId);
        await load();
        onResubmitted?.("approval");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't resubmit this report. Please try again.",
      );
    } finally {
      setIsResubmitting(false);
    }
  }

  // Nothing has ever been sent back — don't take up space on the record.
  if (!isLoading && comments.length === 0 && !awaitingSendBack && !forceVisible) {
    return null;
  }

  return (
    <div
      className={
        bare
          ? "space-y-4"
          : `bg-surface border rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-4 ${
              awaitingSendBack ? "border-amber-300" : "border-slate-300/70"
            }`
      }
    >
      {!bare ? (
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquareWarning
              className={`w-4 h-4 ${awaitingSendBack ? "text-amber-600" : "text-slate-400"}`}
              aria-hidden="true"
            />
            Review Comments
          </h3>
          {comments.length > 0 && (
            <span className="bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-bold rounded-md text-slate-600">
              {comments.length}
            </span>
          )}
        </div>
      ) : comments.length > 0 ? (
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {awaitingRevision && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
          {readOnly
            ? "This report was sent back to the assignee for revision."
            : `The reviewing officer sent this back. Address the comment below,${
                bare
                  ? " upload a new version below if needed,"
                  : " upload a new version under Service Report Delivery if needed,"
              } then resubmit to notify them for another peer review.`}
        </p>
      )}
      {waitingOnReReview && !awaitingRevision && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
          The new PDF is with the reviewing officer. They will sign it again,
          then the approving officer is notified.
        </p>
      )}
      {awaitingChanges && !awaitingRevision && !waitingOnReReview && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
          {readOnly
            ? "This report was sent back to the assignee after approval review."
            : `The approving officer sent this back. Address the comment below,${
                bare
                  ? " upload a new version below if needed,"
                  : " upload a new version under Service Report Delivery if needed,"
              } then resubmit to notify them for another review. A new PDF version goes back to the reviewing officer first.`}
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-slate-400 italic">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          {forceVisible && !awaitingSendBack
            ? "No review comments for this report yet."
            : "No comments yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const previousCommentedPath = commentedPdfPath(
              comment,
              currentFilePath,
            );
            return (
            <li
              key={comment.id}
              className={`rounded-xl border px-3 py-2.5 ${
                comment.resolved_at
                  ? "border-slate-200 bg-white"
                  : "border-amber-200 bg-amber-50/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 truncate">
                    {comment.author_name ?? "Unknown user"}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {comment.stage === "review" ? "Review" : "Approval"}
                  </span>
                </div>
                {comment.resolved_at ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    Resolved
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 shrink-0">
                    Open
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {comment.body}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[10px] text-slate-400">
                  {formatDate(comment.created_at)}
                </p>
                {previousCommentedPath ? (
                  <button
                    type="button"
                    onClick={() =>
                      void openCommentedPdf(
                        previousCommentedPath,
                        comment.file_name,
                      )
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1f5c76] underline decoration-dotted"
                  >
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    Open the PDF this comment referred to
                  </button>
                ) : null}
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold">
          {error}
        </p>
      )}

      {canResubmit && !readOnly && (
        <button
          type="button"
          onClick={() => void handleResubmit()}
          disabled={isResubmitting}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-[#2a7797] hover:bg-[#1f5c76] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          {isResubmitting
            ? "Resubmitting…"
            : awaitingRevision
              ? "Resubmit for review"
              : "Resubmit for approval"}
        </button>
      )}
    </div>
  );
}
