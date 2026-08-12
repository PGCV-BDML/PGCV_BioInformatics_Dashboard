"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  FileCheck2,
  BadgeCheck,
  Eye,
  MessageSquareWarning,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { EmptyState, ErrorState, LoadingState } from "../../components/state-views";
import RequestChangesModal from "../../components/request-changes-modal";
import ConfirmModal from "../../components/confirm-modal";
import {
  approveAnalysis,
  completeAnalysisReview,
  deleteNotification,
  deleteReadNotifications,
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
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";
import { resolveReportUrl } from "@/lib/service-report-file";
import { isMissingSignatureError } from "@/lib/user-signature";
import { notificationsBreadcrumbs } from "@/lib/breadcrumbs";
import { routes } from "@/lib/routes";
import MySignatureModal from "../../components/my-signature-modal";

type FilterMode = "unread" | "all";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

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

function kindBadgeClasses(kind: NotificationKind, n: AppNotification): string {
  if (isSentBackNotification(n)) return "bg-amber-100 text-amber-900";
  if (kind === "approval_complete") return "bg-emerald-100 text-emerald-800";
  if (kind === "review_request") {
    const state = getReviewStageUiState(n.review_status);
    if (state === "reviewed") return "bg-teal-100 text-teal-800";
    if (state === "in_review") return "bg-indigo-100 text-indigo-900";
    return "bg-sky-100 text-sky-800";
  }
  const state = getApprovalUiState(n.submission_status);
  if (state === "approved") return "bg-emerald-100 text-emerald-800";
  if (state === "submitted") return "bg-purple-100 text-purple-800";
  if (state === "under_review") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-700";
}

function kindIcon(kind: NotificationKind, n: AppNotification) {
  if (isSentBackNotification(n)) return MessageSquareWarning;
  if (kind === "approval_complete") return BadgeCheck;
  if (kind === "review_request") {
    return getReviewStageUiState(n.review_status) === "in_review" ? Eye : FileCheck2;
  }
  const state = getApprovalUiState(n.submission_status);
  if (state === "approved" || state === "submitted") return BadgeCheck;
  if (state === "under_review") return Eye;
  return FileCheck2;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("unread");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [sendBackTarget, setSendBackTarget] = useState<AppNotification | null>(
    null,
  );
  const [signaturePrompt, setSignaturePrompt] = useState<{
    analysisId: string;
    action: "review" | "approve";
  } | null>(null);
  const [isClearPromptOpen, setIsClearPromptOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getMyNotifications({ unreadOnly: filter === "unread" });
        if (!cancelled) setNotifications(data);
      } catch (error) {
        console.error("Failed to load notifications:", error);
        if (!cancelled) {
          setLoadError("Couldn't load notifications.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const readCount = useMemo(
    () => notifications.filter((item) => item.is_read).length,
    [notifications],
  );

  const sendBackKind = sendBackTarget
    ? getNotificationKind(sendBackTarget)
    : null;

  function dismissLocally(id: string) {
    if (filter === "unread") {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
  }

  function patchLocal(
    id: string,
    patch: Partial<AppNotification>,
    options?: { removeIfUnreadFilter?: boolean },
  ) {
    if (options?.removeIfUnreadFilter && filter === "unread" && patch.is_read) {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleMarkRead(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await markNotificationRead(id);
      dismissLocally(id);
    } catch (error) {
      console.error(error);
      setActionError("Couldn't mark notification as read.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    setActionNotice(null);
    setBusyId(id);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      setActionError("Couldn't delete this notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClearRead() {
    setActionError(null);
    setActionNotice(null);
    setIsClearing(true);
    try {
      const removed = await deleteReadNotifications();
      setNotifications((prev) => prev.filter((item) => !item.is_read));
      setIsClearPromptOpen(false);
      setActionNotice(
        removed === 1
          ? "Deleted 1 read notification."
          : `Deleted ${removed} read notifications.`,
      );
    } catch (error) {
      console.error(error);
      setActionError("Couldn't clear read notifications.");
    } finally {
      setIsClearing(false);
    }
  }

  async function handleMarkAllRead() {
    setActionError(null);
    try {
      await markAllNotificationsRead();
      if (filter === "unread") {
        setNotifications([]);
        return;
      }
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true })),
      );
    } catch (error) {
      console.error(error);
      setActionError("Couldn't mark all notifications as read.");
    }
  }

  async function handleOpenReport(notification: AppNotification) {
    const kind = getNotificationKind(notification);
    setActionError(null);
    setBusyId(notification.id);
    try {
      if (kind === "review_request") {
        await openReportForReview(notification);
        patchLocal(notification.id, { review_status: "In review" });
      } else if (kind === "approval_request") {
        await openReportForApproval(notification);
        patchLocal(notification.id, { submission_status: "Under review" });
      }
      // approval_complete: open PDF only; no status RPC needed.

      const url = await resolveReportUrl(
        notification.payload.service_report_file_path,
        notification.payload.service_report_link,
      );
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setActionError("Couldn't open the report file.");
      }
    } catch (error) {
      console.error(error);
      setActionError("Couldn't open this report.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCompleteReview(notification: AppNotification) {
    const analysisId = notification.payload.analysis_id;
    if (!analysisId) {
      setActionError("Missing analysis reference for this notification.");
      return;
    }

    setActionError(null);
    setBusyId(notification.id);
    try {
      const result = await completeAnalysisReview(analysisId);
      await markNotificationRead(notification.id);
      patchLocal(
        notification.id,
        { is_read: true, review_status: "Reviewed" },
        { removeIfUnreadFilter: true },
      );
      setActionNotice(
        result.approverAssigned
          ? "Review complete. Signature applied and the approving officer has been notified."
          : "Review complete. Signature applied. Assign an approving officer to continue.",
      );
    } catch (error) {
      console.error(error);
      if (isMissingSignatureError(error)) {
        setSignaturePrompt({ analysisId, action: "review" });
        setActionError("Upload your electronic signature to complete this review.");
      } else {
        setActionError(
          error instanceof Error
            ? error.message
            : "Couldn't complete this review.",
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(notification: AppNotification) {
    const analysisId = notification.payload.analysis_id;
    if (!analysisId) {
      setActionError("Missing analysis reference for this notification.");
      return;
    }

    setActionError(null);
    setBusyId(notification.id);
    try {
      await approveAnalysis(analysisId);
      await markNotificationRead(notification.id);
      patchLocal(
        notification.id,
        {
          is_read: true,
          submission_status: "Approved",
        },
        { removeIfUnreadFilter: true },
      );
      setActionNotice("Approved. Your signature was applied to the PDF.");
    } catch (error) {
      console.error(error);
      if (isMissingSignatureError(error)) {
        setSignaturePrompt({ analysisId, action: "approve" });
        setActionError("Upload your electronic signature to approve this report.");
      } else {
        setActionError(
          error instanceof Error
            ? error.message
            : "Couldn't approve this report.",
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function retryAfterSignatureUpload() {
    const prompt = signaturePrompt;
    if (!prompt) return;
    setSignaturePrompt(null);
    setActionError(null);
    const notification = notifications.find(
      (item) => item.payload.analysis_id === prompt.analysisId,
    );
    if (!notification) return;
    if (prompt.action === "review") {
      await handleCompleteReview(notification);
    } else {
      await handleApprove(notification);
    }
  }

  async function handleSendBack(body: string) {
    const target = sendBackTarget;
    const analysisId = target?.payload.analysis_id;
    if (!target || !analysisId) return;

    setActionError(null);
    setActionNotice(null);
    const kind = getNotificationKind(target);
    const { notifiedAssignee } =
      kind === "review_request"
        ? await requestAnalysisRevision(analysisId, body)
        : await requestAnalysisChanges(analysisId, body);

    patchLocal(
      target.id,
      {
        is_read: true,
        ...(kind === "review_request"
          ? { review_status: "Revision requested" }
          : { submission_status: "Changes requested" }),
      },
      { removeIfUnreadFilter: true },
    );

    setActionNotice(
      notifiedAssignee
        ? "Sent back to the assignee."
        : "Comment saved, but this record has no assignee to notify.",
    );
  }

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 px-4 font-aileron">
      <PageHeader
        breadcrumbTrail={notificationsBreadcrumbs}
        title="Notifications"
        subtitle="Peer review, approval alerts, and revision comments for service reports"
        actions={
          <>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-surface p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  filter === "unread"
                    ? "bg-[#2a7797] text-white"
                    : "text-slate-600 hover:text-[#2a7797]"
                }`}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                  filter === "all"
                    ? "bg-[#2a7797] text-white"
                    : "text-slate-600 hover:text-[#2a7797]"
                }`}
              >
                All
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>

            {filter === "all" && (
              <button
                type="button"
                onClick={() => setIsClearPromptOpen(true)}
                disabled={readCount === 0}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700 disabled:hover:border-slate-200 text-slate-700 text-xs font-bold rounded-full transition-all whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear read
              </button>
            )}
          </>
        }
      />

      {actionError && (
        <p className="text-sm text-red-600 font-aileron" role="alert">
          {actionError}
        </p>
      )}

      {actionNotice && (
        <p className="text-sm text-amber-800 font-aileron" role="status">
          {actionNotice}
        </p>
      )}

      {loadError ? (
        <ErrorState message={loadError} />
      ) : isLoading ? (
        <LoadingState message="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((notification) => {
            const isBusy = busyId === notification.id;
            const kind = getNotificationKind(notification);
            const sentBack = isSentBackNotification(notification);
            const approvalComplete = isApprovalCompleteNotification(notification);
            const reviewState = getReviewStageUiState(notification.review_status);
            const approvalState = getApprovalUiState(
              notification.submission_status,
            );
            const StatusIcon = kindIcon(kind, notification);
            const hasReport = Boolean(
              notification.payload.service_report_file_path?.trim() ||
                notification.payload.service_report_link?.trim(),
            );
            const canActOnReview =
              kind === "review_request" &&
              Boolean(notification.payload.analysis_id) &&
              (reviewState === "ready" || reviewState === "in_review");
            const canActOnApproval =
              kind === "approval_request" &&
              Boolean(notification.payload.analysis_id) &&
              (approvalState === "ready" || approvalState === "under_review");
            const isAmber =
              sentBack ||
              reviewState === "in_review" ||
              approvalState === "under_review";

            return (
              <div
                key={notification.id}
                className={`rounded-[22px] border p-5 shadow-[0_10px_24px_rgba(23,33,38,0.06)] ${
                  sentBack
                    ? "border-amber-200 bg-amber-50/40"
                    : approvalComplete
                      ? "border-emerald-200 bg-emerald-50/40"
                      : kind === "approval_request" &&
                          (approvalState === "approved" ||
                            approvalState === "submitted")
                        ? "border-emerald-200 bg-emerald-50/40"
                        : notification.is_read
                          ? "border-slate-200 bg-slate-50/70"
                          : "border-emerald-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        isAmber ? "bg-amber-100" : "bg-emerald-100"
                      }`}
                    >
                      <StatusIcon
                        className={`h-4 w-4 ${
                          isAmber ? "text-amber-800" : "text-emerald-700"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider font-quicksand ${kindBadgeClasses(kind, notification)}`}
                      >
                        {kindTitle(kind, notification)}
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-slate-900 truncate">
                        {notification.payload.client_name || "Unnamed analysis"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {notification.payload.service_report_number
                          ? `Service report ${notification.payload.service_report_number}`
                          : notification.payload.service_report_file_name
                            ? notification.payload.service_report_file_name
                            : "Service report ready"}
                      </p>
                      {sentBack && notification.payload.comment && (
                        <blockquote className="mt-3 rounded-xl border border-amber-200 bg-white/70 px-3 py-2.5">
                          <p className="text-sm text-amber-950 leading-relaxed whitespace-pre-wrap">
                            {notification.payload.comment}
                          </p>
                          {notification.payload.comment_author && (
                            <footer className="mt-1.5 text-[11px] font-bold text-amber-700">
                              — {notification.payload.comment_author}
                            </footer>
                          )}
                        </blockquote>
                      )}
                      {approvalComplete && notification.payload.approved_by && (
                        <p className="mt-3 rounded-xl border border-emerald-200 bg-white/70 px-3 py-2.5 text-sm text-emerald-950 leading-relaxed">
                          Approved by {notification.payload.approved_by}. Mark the
                          report <strong>Submitted</strong> in the tracker once it
                          goes out to the client.
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-400">
                        Notified {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {sentBack ? (
                      notification.payload.analysis_id && (
                        <Link
                          href={routes.services.detail(
                            notification.payload.analysis_id,
                          )}
                          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open record
                        </Link>
                      )
                    ) : approvalComplete ? (
                      <>
                        {hasReport && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleOpenReport(notification)}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Report
                          </button>
                        )}
                        {notification.payload.analysis_id && (
                          <Link
                            href={routes.services.detail(
                              notification.payload.analysis_id,
                            )}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full transition-all whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open record
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        {hasReport && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleOpenReport(notification)}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#2a7797] hover:bg-[#1c5c59] disabled:opacity-60 text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Report
                          </button>
                        )}
                        {canActOnReview ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleCompleteReview(notification)
                              }
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                            >
                              <BadgeCheck className="w-3.5 h-3.5" />
                              Complete review
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setSendBackTarget(notification)}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-800 text-xs font-bold rounded-full transition-all whitespace-nowrap"
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5" />
                              Request revision
                            </button>
                          </>
                        ) : null}
                        {canActOnApproval ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleApprove(notification)}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-full shadow-md transition-all whitespace-nowrap"
                            >
                              <BadgeCheck className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setSendBackTarget(notification)}
                              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-800 text-xs font-bold rounded-full transition-all whitespace-nowrap"
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5" />
                              Request changes
                            </button>
                          </>
                        ) : null}
                      </>
                    )}
                    {notification.is_read ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDelete(notification.id)}
                        aria-label="Delete this notification"
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-60 text-slate-600 text-xs font-bold rounded-full transition-all whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleMarkRead(notification.id)}
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-bold rounded-full transition-all whitespace-nowrap"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={isClearPromptOpen}
        title="Clear read notifications"
        message={
          readCount === 1
            ? "This deletes 1 read notification. The service reports themselves are untouched."
            : `This deletes ${readCount} read notifications. The service reports themselves are untouched.`
        }
        confirmLabel="Delete them"
        isConfirming={isClearing}
        onClose={() => setIsClearPromptOpen(false)}
        onConfirm={() => void handleClearRead()}
      />

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
