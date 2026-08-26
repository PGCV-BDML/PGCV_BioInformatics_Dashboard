import { supabase, getCurrentUser, saveDataToDB } from "@/lib/supabase";
import {
  deriveLegacyStatus,
  isChangesRequestedLabel,
  isReviewComplete,
  isRevisionRequestedLabel,
  submissionStatusRank,
} from "@/lib/analysis-tracker";
import type { AnalysisReviewComment, ReviewCommentStage } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Notification types                                                */
/* ------------------------------------------------------------------ */

/** Sent to the reviewing officer when a report needs a peer read. */
export const NOTIFICATION_READY_FOR_REVIEW = "analysis_ready_for_review";
/** Sent to the assignee when the reviewing officer asks for a revision. */
export const NOTIFICATION_REVISION_REQUESTED = "analysis_revision_requested";
/** Sent to the approving officer once the review is signed off. */
export const NOTIFICATION_READY_FOR_APPROVAL = "analysis_ready_for_approval";
/** Sent to the assignee when the approving officer sends a report back. */
export const NOTIFICATION_CHANGES_REQUESTED = "analysis_changes_requested";
/** Sent to the assignee when the approving officer signs the report off. */
export const NOTIFICATION_APPROVED = "analysis_approved";
/** Sent to the point person when they are assigned an incident report. */
export const NOTIFICATION_INCIDENT_ASSIGNED = "incident_assigned";

export type AppNotification = {
  id: string;
  type: string;
  payload: {
    analysis_id?: string;
    client_name?: string | null;
    service_report_number?: string | null;
    service_report_link?: string | null;
    service_report_file_path?: string | null;
    service_report_file_name?: string | null;
    /** Present on the two "sent back" types only. */
    comment?: string | null;
    comment_author?: string | null;
    /** Present on analysis_approved only. */
    approved_by?: string | null;
    /** Present on incident_assigned. */
    incident_id?: string;
    title?: string | null;
    severity?: string | null;
    category?: string | null;
    status?: string | null;
    reporter_name?: string | null;
  };
  target_user_id: string;
  is_read: boolean;
  email_sent_at: string | null;
  created_at: string;
  /** Enriched from analysis.status_of_review when available. */
  review_status?: string | null;
  /** Enriched from analysis.status_of_submission when available. */
  submission_status?: string | null;
};

/**
 * Which card to render. Each notification belongs to exactly one stage and
 * one audience, and the actions differ across all five types.
 */
export type NotificationKind =
  | "review_request"
  | "revision_request"
  | "approval_request"
  | "change_request"
  | "approval_complete"
  | "incident_assigned";

export function getNotificationKind(n: AppNotification): NotificationKind {
  switch (n.type) {
    case NOTIFICATION_REVISION_REQUESTED:
      return "revision_request";
    case NOTIFICATION_READY_FOR_APPROVAL:
      return "approval_request";
    case NOTIFICATION_CHANGES_REQUESTED:
      return "change_request";
    case NOTIFICATION_APPROVED:
      return "approval_complete";
    case NOTIFICATION_INCIDENT_ASSIGNED:
      return "incident_assigned";
    case NOTIFICATION_READY_FOR_REVIEW:
    default:
      return "review_request";
  }
}

export function isIncidentAssignedNotification(n: AppNotification): boolean {
  return n.type === NOTIFICATION_INCIDENT_ASSIGNED;
}

/** True for notifications the assignee receives when a report is sent back. */
export function isSentBackNotification(n: AppNotification): boolean {
  const kind = getNotificationKind(n);
  return kind === "revision_request" || kind === "change_request";
}

/** True when the assignee is notified that approval is complete. */
export function isApprovalCompleteNotification(n: AppNotification): boolean {
  return getNotificationKind(n) === "approval_complete";
}

/* ------------------------------------------------------------------ */
/*  Stage UI state                                                    */
/* ------------------------------------------------------------------ */

export type ReviewAction = "Under review" | "Approved";

/** Approval stage, driven by analysis.status_of_submission. */
export type ApprovalUiState =
  | "ready"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "submitted";

export function getApprovalUiState(
  submissionStatus: string | null | undefined,
): ApprovalUiState {
  // Checked by label first: "Changes requested" sits outside the rank ladder,
  // so the rank maths below would otherwise read it as "ready".
  if (isChangesRequestedLabel(submissionStatus)) return "changes_requested";
  const rank = submissionStatusRank(submissionStatus);
  if (rank >= 4) return "submitted";
  if (rank >= 3) return "approved";
  if (rank >= 2) return "under_review";
  return "ready";
}

export function getApprovalStatusLabel(state: ApprovalUiState): string {
  switch (state) {
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "under_review":
      return "Under review";
    case "changes_requested":
      return "Changes requested";
    default:
      return "Ready for approval";
  }
}

/** Review stage, driven by analysis.status_of_review. */
export type ReviewStageUiState =
  | "ready"
  | "in_review"
  | "revision_requested"
  | "reviewed";

export function getReviewStageUiState(
  reviewStatus: string | null | undefined,
): ReviewStageUiState {
  if (isRevisionRequestedLabel(reviewStatus)) return "revision_requested";
  const t = String(reviewStatus ?? "").trim().toLowerCase();
  if (t === "reviewed") return "reviewed";
  if (t === "in review" || t === "in_review") return "in_review";
  return "ready";
}

export function getReviewStageLabel(state: ReviewStageUiState): string {
  switch (state) {
    case "reviewed":
      return "Reviewed";
    case "in_review":
      return "In review";
    case "revision_requested":
      return "Revision requested";
    default:
      return "Ready for review";
  }
}

/* ------------------------------------------------------------------ */
/*  Fetching                                                          */
/* ------------------------------------------------------------------ */

async function enrichWithStageStatus(
  notifications: AppNotification[],
): Promise<AppNotification[]> {
  const analysisIds = Array.from(
    new Set(
      notifications
        .map((n) => n.payload.analysis_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (analysisIds.length === 0) return notifications;

  const { data, error } = await supabase
    .from("analysis")
    .select("id, status_of_review, status_of_submission")
    .in("id", analysisIds);

  if (error) {
    console.error("Failed to enrich notifications with stage status:", error);
    return notifications;
  }

  const byId = new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        review: row.status_of_review as string | null,
        submission: row.status_of_submission as string | null,
      },
    ]),
  );

  return notifications.map((n) => {
    const found = n.payload.analysis_id ? byId.get(n.payload.analysis_id) : undefined;
    return {
      ...n,
      review_status: found ? found.review : (n.review_status ?? null),
      submission_status: found ? found.submission : (n.submission_status ?? null),
    };
  });
}

/** Fetch notifications for the currently authenticated user. */
export async function getMyNotifications(
  options?: { unreadOnly?: boolean },
): Promise<AppNotification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.unreadOnly ?? true) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return enrichWithStageStatus((data ?? []) as AppNotification[]);
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    console.error("Failed to mark notification as read:", error);
    throw error;
  }
}

/** Mark all unread notifications as read for the current user. */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) {
    console.error("Failed to mark all notifications as read:", error);
    throw error;
  }
}

/**
 * Permanently remove a notification. RLS only permits this once the row is
 * read, so a review or approval request can't be discarded before it has
 * been seen.
 */
export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete notification:", error);
    throw error;
  }
}

/** Clear every read notification for the current user. Returns how many went. */
export async function deleteReadNotifications(): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("is_read", true)
    .select("id");

  if (error) {
    console.error("Failed to clear read notifications:", error);
    throw error;
  }

  return (data ?? []).length;
}

/** Unread count for the current user (RLS already scopes the query). */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Failed to count unread notifications:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Subscribe to real-time inserts into the notifications table for the current user.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (notification: AppNotification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `target_user_id=eq.${userId}`,
      },
      (payload) => {
        onNew(payload.new as AppNotification);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to any notification row change for the current user so unread
 * badges stay in sync when items are inserted, marked read, or deleted.
 */
export function subscribeToNotificationChanges(
  userId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`notifications-count:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `target_user_id=eq.${userId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                    */
/* ------------------------------------------------------------------ */

async function getActorDisplayName(
  fallback = "Approving officer",
): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return fallback;

  const { data } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const name = data?.name?.trim();
  if (name) return name;

  const meta = user.user_metadata as
    | { full_name?: string; name?: string }
    | undefined;
  return (
    meta?.full_name?.trim() || meta?.name?.trim() || user.email || fallback
  );
}

function buildSystemNote(action: string, actor: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `System: ${action} by ${actor} on ${date}`;
}

function appendSystemNote(
  existing: string | null | undefined,
  line: string,
): string {
  const current = (existing ?? "").trim();
  if (current.includes(line)) return current;
  // Avoid repeating the same action type on the same day if wording drifts.
  const actionPrefix = line.split(" by ")[0];
  if (actionPrefix && current.includes(actionPrefix)) return current;
  return current ? `${current}\n${line}` : line;
}

/* ------------------------------------------------------------------ */
/*  Review stage — the reviewing officer                              */
/* ------------------------------------------------------------------ */

/**
 * Mark the report as being read. Goes through an RPC rather than a direct
 * update so the reviewer assignment is checked server side; every other
 * staff member can write to `analysis` under RLS.
 */
export async function markAnalysisInReview(analysisId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_analysis_in_review", {
    p_analysis_id: analysisId,
  });

  if (error) {
    console.error("Failed to mark analysis in review:", error);
    throw error;
  }
}

export type CompleteReviewResult = {
  /** False when nobody has been named yet — the sign-off stands, no alert went out. */
  approverAssigned: boolean;
  alreadyReviewed: boolean;
};

/** Reviewing officer signs the report off, which opens the approval stage. */
export async function completeAnalysisReview(
  analysisId: string,
  body?: string,
): Promise<CompleteReviewResult> {
  const trimmed = body?.trim() ?? "";

  // Stamp before flipping status so a Reviewed report always carries the
  // reviewing officer's e-sig when a PDF is on file.
  const { stampServiceReportSignature } = await import(
    "@/lib/service-report-signature"
  );
  await stampServiceReportSignature(analysisId, "reviewed_by");

  const { data, error } = await supabase.rpc("complete_analysis_review", {
    p_analysis_id: analysisId,
    p_body: trimmed || null,
  });

  if (error) {
    console.error("Failed to complete review:", error);
    throw error;
  }

  const result = (data ?? {}) as {
    approver_assigned?: boolean;
    already_reviewed?: boolean;
  };
  return {
    approverAssigned: Boolean(result.approver_assigned),
    alreadyReviewed: Boolean(result.already_reviewed),
  };
}

export type SendBackResult = {
  /** False when the record has no assignee — the comment saved, nobody was pinged. */
  notifiedAssignee: boolean;
};

/** Reviewing officer sends the report back to its assignee with a comment. */
export async function requestAnalysisRevision(
  analysisId: string,
  body: string,
): Promise<SendBackResult> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("A comment is required when requesting a revision.");
  }

  const { data, error } = await supabase.rpc("request_analysis_revision", {
    p_analysis_id: analysisId,
    p_body: trimmed,
  });

  if (error) {
    console.error("Failed to request revision:", error);
    throw error;
  }

  const result = (data ?? {}) as { notified_assignee?: boolean };
  return { notifiedAssignee: Boolean(result.notified_assignee) };
}

/**
 * Analyst side of a revision request: put the report back in front of the
 * reviewing officer. The database trigger re-notifies them off this change.
 */
export async function resubmitForReview(analysisId: string): Promise<void> {
  const { data: analysis, error } = await supabase
    .from("analysis")
    .select("id, status_of_review, notes")
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load analysis for re-review:", error);
    throw error;
  }
  if (!analysis) {
    throw new Error("Analysis not found for re-review.");
  }
  if (!isRevisionRequestedLabel(analysis.status_of_review)) {
    throw new Error("This report has no outstanding revision request.");
  }

  const actor = await getActorDisplayName("Assignee");
  const nextNotes = appendSystemNote(
    analysis.notes,
    buildSystemNote("Resubmitted for review", actor),
  );

  await saveDataToDB("analysis", analysisId, {
    status_of_review: "For review",
    notes: nextNotes || null,
  });

  const user = await getCurrentUser();
  await resolveOpenReviewComments(analysisId, user?.id ?? null, "review");
}

/* ------------------------------------------------------------------ */
/*  Approval stage — the approving officer                            */
/* ------------------------------------------------------------------ */

async function applyApprovalAction(
  analysisId: string,
  action: ReviewAction,
): Promise<void> {
  if (action === "Under review") {
    const { error } = await supabase.rpc("mark_analysis_under_review", {
      p_analysis_id: analysisId,
    });
    if (error) {
      console.error("Failed to mark analysis under review:", error);
      throw error;
    }
    return;
  }

  const { data, error } = await supabase.rpc("approve_analysis", {
    p_analysis_id: analysisId,
  });

  if (error) {
    console.error("Failed to approve analysis:", error);
    throw error;
  }

  const result = (data ?? {}) as { already_approved?: boolean };
  if (!result.already_approved) {
    // Comments are resolved inside the RPC; nothing else to do client-side.
  }
}

/** Set submission status to Under review + append a system note (no backwards move). */
export async function markAnalysisUnderReview(
  analysisId: string,
): Promise<void> {
  await applyApprovalAction(analysisId, "Under review");
}

/** Set submission status to Approved + append a system note (no backwards move). */
export async function approveAnalysis(analysisId: string): Promise<void> {
  const { stampServiceReportSignature } = await import(
    "@/lib/service-report-signature"
  );
  await stampServiceReportSignature(analysisId, "approved_by");
  await applyApprovalAction(analysisId, "Approved");
}

/** Officer opens the report: mark it as being looked at. Safe to repeat. */
export async function openReportForApproval(
  notification: AppNotification,
): Promise<void> {
  const analysisId = notification.payload.analysis_id;
  if (analysisId) {
    await markAnalysisUnderReview(analysisId);
  }
}

/** Reviewer opens the report: mark it as being read. Safe to repeat. */
export async function openReportForReview(
  notification: AppNotification,
): Promise<void> {
  const analysisId = notification.payload.analysis_id;
  if (analysisId) {
    await markAnalysisInReview(analysisId);
  }
}

/** Officer sends the report back to its assignee with a comment. */
export async function requestAnalysisChanges(
  analysisId: string,
  body: string,
): Promise<SendBackResult> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("A comment is required when requesting changes.");
  }

  const { data, error } = await supabase.rpc("request_analysis_changes", {
    p_analysis_id: analysisId,
    p_body: trimmed,
  });

  if (error) {
    console.error("Failed to request changes:", error);
    throw error;
  }

  const result = (data ?? {}) as { notified_assignee?: boolean };
  return { notifiedAssignee: Boolean(result.notified_assignee) };
}

/**
 * Analyst side of a change request: put the report back in front of the officer.
 * The database trigger re-notifies them off this status transition.
 */
export async function resubmitForApproval(analysisId: string): Promise<void> {
  const { data: analysis, error } = await supabase
    .from("analysis")
    .select(
      "id, status_of_completion, status_of_review, status_of_submission, notes",
    )
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load analysis for resubmission:", error);
    throw error;
  }
  if (!analysis) {
    throw new Error("Analysis not found for resubmission.");
  }
  if (!isChangesRequestedLabel(analysis.status_of_submission)) {
    throw new Error("This report has no outstanding change request.");
  }
  if (!isReviewComplete(analysis.status_of_review)) {
    throw new Error(
      "The reviewing officer must sign the new PDF before this can go back for approval.",
    );
  }

  const actor = await getActorDisplayName("Assignee");
  const nextNotes = appendSystemNote(
    analysis.notes,
    buildSystemNote("Resubmitted for approval", actor),
  );

  await saveDataToDB("analysis", analysisId, {
    status_of_submission: "For approval",
    status: deriveLegacyStatus({
      status_of_completion: analysis.status_of_completion,
      status_of_submission: "For approval",
    }),
    notes: nextNotes || null,
  });

  const user = await getCurrentUser();
  await resolveOpenReviewComments(analysisId, user?.id ?? null, "approval");
}

/* ------------------------------------------------------------------ */
/*  Review comments                                                   */
/* ------------------------------------------------------------------ */

export type ReviewCommentWithAuthor = AnalysisReviewComment & {
  author_name: string | null;
};

/** Comments for one analysis across both stages, newest first. */
export async function getReviewComments(
  analysisId: string,
): Promise<ReviewCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("analysis_review_comment")
    .select("*, author:users!analysis_review_comment_author_id_fkey (name)")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load review comments:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const { author, ...rest } = row as AnalysisReviewComment & {
      author?: { name?: string | null } | null;
    };
    return {
      ...rest,
      stage: rest.stage ?? "approval",
      author_name: author?.name?.trim() || null,
    };
  });
}

async function resolveOpenReviewComments(
  analysisId: string,
  userId: string | null,
  stage: ReviewCommentStage,
): Promise<void> {
  const { error } = await supabase
    .from("analysis_review_comment")
    .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("analysis_id", analysisId)
    .eq("stage", stage)
    .is("resolved_at", null);

  if (error) {
    // Non-fatal: the status change is what drives the workflow.
    console.error("Failed to resolve review comments:", error);
  }
}
