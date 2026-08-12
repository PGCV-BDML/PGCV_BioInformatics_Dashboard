"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ExternalLink,
  CheckCheck,
  FileCheck2,
  BadgeCheck,
  Eye,
  MessageSquareWarning,
} from "lucide-react";
import {
  approveAnalysis,
  completeAnalysisReview,
  getApprovalStatusLabel,
  getApprovalUiState,
  getMyNotifications,
  getNotificationKind,
  getReviewStageLabel,
  getReviewStageUiState,
  isApprovalCompleteNotification,
  isSentBackNotification,
  markAllNotificationsRead,
  markNotificationRead,
  openReportForApproval,
  openReportForReview,
  requestAnalysisChanges,
  requestAnalysisRevision,
  subscribeToNotifications,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";
import { resolveReportUrl } from "@/lib/service-report-file";
import { isMissingSignatureError } from "@/lib/user-signature";
import { getCurrentUser } from "@/lib/supabase";
import { routes } from "@/lib/routes";
import RequestChangesModal from "./request-changes-modal";
import MySignatureModal from "./my-signature-modal";

function kindTitle(kind: NotificationKind, n: AppNotification): string {
  switch (kind) {
    case "revision_request":
      return "Revision requested";
    case "change_request":
      return "Changes requested";
    case "approval_complete":
      return "Report approved";
    case "review_request":
      return getReviewStageLabel(getReviewStageUiState(n.review_status));
    case "approval_request":
      return getApprovalStatusLabel(getApprovalUiState(n.submission_status));
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendBackTarget, setSendBackTarget] = useState<AppNotification | null>(
    null,
  );
  const [signaturePrompt, setSignaturePrompt] = useState<{
    analysisId: string;
    action: "review" | "approve";
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  useEffect(() => {
    getMyNotifications({ unreadOnly: true }).then(setNotifications);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, (n) => {
      setNotifications((prev) => [n, ...prev]);
    });
    return unsub;
  }, [userId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.length;
  const sendBackKind = sendBackTarget
    ? getNotificationKind(sendBackTarget)
    : null;

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications([]);
  }

  async function handleOpenReport(n: AppNotification) {
    const kind = getNotificationKind(n);
    setBusyId(n.id);
    try {
      if (kind === "review_request") {
        await openReportForReview(n);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id
              ? { ...item, review_status: "In review" }
              : item,
          ),
        );
      } else if (kind === "approval_request") {
        await openReportForApproval(n);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id
              ? { ...item, submission_status: "Under review" }
              : item,
          ),
        );
      }

      const url = await resolveReportUrl(
        n.payload.service_report_file_path,
        n.payload.service_report_link,
      );
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenApprovedReport(n: AppNotification) {
    setBusyId(n.id);
    try {
      const url = await resolveReportUrl(
        n.payload.service_report_file_path,
        n.payload.service_report_link,
      );
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCompleteReview(n: AppNotification) {
    const analysisId = n.payload.analysis_id;
    if (!analysisId) return;
    setBusyId(n.id);
    try {
      await completeAnalysisReview(analysisId);
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    } catch (error) {
      console.error(error);
      if (isMissingSignatureError(error)) {
        setSignaturePrompt({ analysisId, action: "review" });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(n: AppNotification) {
    const analysisId = n.payload.analysis_id;
    if (!analysisId) return;
    setBusyId(n.id);
    try {
      await approveAnalysis(analysisId);
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    } catch (error) {
      console.error(error);
      if (isMissingSignatureError(error)) {
        setSignaturePrompt({ analysisId, action: "approve" });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function retryAfterSignatureUpload() {
    const prompt = signaturePrompt;
    if (!prompt) return;
    setSignaturePrompt(null);
    const n = notifications.find(
      (item) => item.payload.analysis_id === prompt.analysisId,
    );
    if (!n) return;
    if (prompt.action === "review") {
      await handleCompleteReview(n);
    } else {
      await handleApprove(n);
    }
  }

  async function handleSendBack(body: string) {
    const target = sendBackTarget;
    const analysisId = target?.payload.analysis_id;
    if (!target || !analysisId) return;

    const kind = getNotificationKind(target);
    if (kind === "review_request") {
      await requestAnalysisRevision(analysisId, body);
    } else {
      await requestAnalysisChanges(analysisId, body);
    }
    setNotifications((prev) => prev.filter((item) => item.id !== target.id));
  }

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-[#64748b] hover:bg-brand-tint hover:text-[#2a7797] transition-colors"
      >
        <Bell className="w-4 h-4 stroke-[2.5]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-11 right-0 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-[rgba(23,33,38,0.1)] rounded-2xl shadow-[0px_16px_40px_rgba(23,33,38,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-[12px] font-extrabold text-[#1e293b] uppercase tracking-wider font-quicksand">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1c5c59] transition-colors font-aileron"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Bell className="w-6 h-6 opacity-40" />
                <p className="text-[12px] font-bold font-aileron">All caught up</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isBusy = busyId === n.id;
                const kind = getNotificationKind(n);
                const sentBack = isSentBackNotification(n);
                const approvalComplete = isApprovalCompleteNotification(n);
                const reviewState = getReviewStageUiState(n.review_status);
                const approvalState = getApprovalUiState(n.submission_status);
                const hasReport = Boolean(
                  n.payload.service_report_file_path?.trim() ||
                    n.payload.service_report_link?.trim(),
                );
                const canActOnReview =
                  kind === "review_request" &&
                  Boolean(n.payload.analysis_id) &&
                  (reviewState === "ready" || reviewState === "in_review");
                const canActOnApproval =
                  kind === "approval_request" &&
                  Boolean(n.payload.analysis_id) &&
                  (approvalState === "ready" || approvalState === "under_review");

                const StatusIcon = sentBack
                  ? MessageSquareWarning
                  : approvalComplete
                    ? BadgeCheck
                    : kind === "review_request"
                      ? reviewState === "in_review"
                        ? Eye
                        : FileCheck2
                      : approvalState === "under_review"
                        ? Eye
                        : approvalState === "approved" ||
                            approvalState === "submitted"
                          ? BadgeCheck
                          : FileCheck2;

                return (
                  <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                          sentBack
                            ? "bg-amber-100"
                            : approvalComplete
                              ? "bg-emerald-100"
                              : "bg-emerald-100"
                        }`}
                      >
                        <StatusIcon
                          className={`w-3.5 h-3.5 ${
                            sentBack
                              ? "text-amber-700"
                              : approvalComplete
                                ? "text-emerald-700"
                                : "text-emerald-700"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-extrabold text-[#1e293b] font-aileron leading-tight">
                          {kindTitle(kind, n)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-aileron mt-0.5 truncate">
                          {n.payload.client_name ?? "—"}
                          {n.payload.service_report_number
                            ? ` · ${n.payload.service_report_number}`
                            : ""}
                        </p>
                        {sentBack && n.payload.comment && (
                          <p className="mt-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-[11px] text-amber-900 font-aileron leading-relaxed line-clamp-3">
                            {n.payload.comment_author
                              ? `${n.payload.comment_author}: `
                              : ""}
                            {n.payload.comment}
                          </p>
                        )}
                        {approvalComplete && n.payload.approved_by && (
                          <p className="mt-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 text-[11px] text-emerald-900 font-aileron leading-relaxed">
                            Approved by {n.payload.approved_by}. Mark the report
                            Submitted once it goes out to the client.
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {sentBack ? (
                            n.payload.analysis_id && (
                              <Link
                                href={routes.services.detail(
                                  n.payload.analysis_id,
                                )}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 transition-colors font-aileron"
                              >
                                <ExternalLink className="w-3 h-3" /> Open record
                              </Link>
                            )
                          ) : approvalComplete ? (
                            <>
                              {hasReport && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleOpenApprovedReport(n)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-60 transition-colors font-aileron"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open Report
                                </button>
                              )}
                              {n.payload.analysis_id && (
                                <Link
                                  href={routes.services.detail(
                                    n.payload.analysis_id,
                                  )}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors font-aileron"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open record
                                </Link>
                              )}
                            </>
                          ) : (
                            <>
                              {hasReport && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleOpenReport(n)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2a7797] hover:text-[#1c5c59] disabled:opacity-60 transition-colors font-aileron"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open Report
                                </button>
                              )}
                              {canActOnReview ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleCompleteReview(n)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-60 transition-colors font-aileron"
                                  >
                                    <BadgeCheck className="w-3 h-3" /> Complete review
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setSendBackTarget(n)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 disabled:opacity-60 transition-colors font-aileron"
                                  >
                                    <MessageSquareWarning className="w-3 h-3" />{" "}
                                    Request revision
                                  </button>
                                </>
                              ) : null}
                              {canActOnApproval ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleApprove(n)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-60 transition-colors font-aileron"
                                  >
                                    <BadgeCheck className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setSendBackTarget(n)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 disabled:opacity-60 transition-colors font-aileron"
                                  >
                                    <MessageSquareWarning className="w-3 h-3" />{" "}
                                    Request changes
                                  </button>
                                </>
                              ) : null}
                            </>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleMarkRead(n.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 disabled:opacity-60 transition-colors font-aileron ml-auto"
                          >
                            <CheckCheck className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:text-[#1c5c59] transition-colors font-aileron"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}

      <RequestChangesModal
        isOpen={sendBackTarget !== null}
        onClose={() => setSendBackTarget(null)}
        mode={sendBackKind === "review_request" ? "revision" : "changes"}
        reportLabel={
          sendBackTarget?.payload.service_report_number ||
          sendBackTarget?.payload.client_name ||
          "Service report"
        }
        onSubmit={handleSendBack}
      />

      <MySignatureModal
        isOpen={signaturePrompt !== null}
        onClose={() => setSignaturePrompt(null)}
        requiredForAction
        onUploaded={() => {
          void retryAfterSignatureUpload();
        }}
      />
    </div>
  );
}
