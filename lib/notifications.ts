import { supabase, getCurrentUser, saveDataToDB } from "@/lib/supabase";
import {
  deriveLegacyStatus,
  isChangesRequestedLabel,
  shouldAdvanceSubmissionStatus,
  submissionStatusRank,
} from "@/lib/analysis-tracker";
import type { AnalysisReviewComment } from "@/types/database";

/** Sent to the approving officer when a report is ready to sign off. */
export const NOTIFICATION_READY_FOR_REVIEW = "analysis_ready_for_review";
/** Sent to the assignee when the officer sends a report back with a comment. */
export const NOTIFICATION_CHANGES_REQUESTED = "analysis_changes_requested";

export type AppNotification = {
  id: string;
  type: string;
  payload: {
    analysis_id?: string;
    client_name?: string | null;
    service_report_number?: string | null;
    service_report_link?: string | null;
    /** Present on `analysis_changes_requested` only. */
    comment?: string | null;
    comment_author?: string | null;
  };
  target_user_id: string;
  is_read: boolean;
  email_sent_at: string | null;
  created_at: string;
  /** Enriched from analysis.status_of_submission when available. */
  submission_status?: string | null;
};

export type ReviewAction = "Under review" | "Approved";

export type ReviewUiState =
  | "ready"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "submitted";

/** True for notifications the analyst acts on rather than the approving officer. */
export function isChangeRequestNotification(n: AppNotification): boolean {
  return n.type === NOTIFICATION_CHANGES_REQUESTED;
}

export function getReviewUiState(
  submissionStatus: string | null | undefined,
): ReviewUiState {
  // Checked by label first: "Changes requested" sits outside the rank ladder,
  // so the rank maths below would otherwise read it as "ready".
  if (isChangesRequestedLabel(submissionStatus)) return "changes_requested";
  const rank = submissionStatusRank(submissionStatus);
  if (rank >= 4) return "submitted";
  if (rank >= 3) return "approved";
  if (rank >= 2) return "under_review";
  return "ready";
}

export function getReviewStatusLabel(state: ReviewUiState): string {
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
      return "Ready for review";
  }
}

async function enrichWithSubmissionStatus(
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
    .select("id, status_of_submission")
    .in("id", analysisIds);

  if (error) {
    console.error("Failed to enrich notifications with submission status:", error);
    return notifications;
  }

  const byId = new Map(
    (data ?? []).map((row) => [row.id as string, row.status_of_submission as string | null]),
  );

  return notifications.map((n) => ({
    ...n,
    submission_status: n.payload.analysis_id
      ? (byId.get(n.payload.analysis_id) ?? n.submission_status ?? null)
      : (n.submission_status ?? null),
  }));
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

  return enrichWithSubmissionStatus((data ?? []) as AppNotification[]);
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
 * read, so an approval request can't be discarded before it has been seen.
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

function buildSystemNote(action: ReviewAction, actor: string): string {
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

async function applyReviewAction(
  analysisId: string,
  action: ReviewAction,
): Promise<void> {
  const { data: analysis, error } = await supabase
    .from("analysis")
    .select("id, status_of_completion, status_of_submission, notes")
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load analysis for review action:", error);
    throw error;
  }
  if (!analysis) {
    throw new Error("Analysis not found for review action.");
  }

  const nextSubmission = action;
  const canAdvance = shouldAdvanceSubmissionStatus(
    analysis.status_of_submission,
    nextSubmission,
  );

  const actor = await getActorDisplayName();
  const noteLine = buildSystemNote(action, actor);
  const nextNotes = appendSystemNote(analysis.notes, noteLine);

  if (!canAdvance && nextNotes === (analysis.notes ?? "").trim()) {
    return;
  }

  const payload: Record<string, unknown> = {
    notes: nextNotes || null,
  };

  if (canAdvance) {
    payload.status_of_submission = nextSubmission;
    payload.status = deriveLegacyStatus({
      status_of_completion: analysis.status_of_completion,
      status_of_submission: nextSubmission,
    });
  }

  await saveDataToDB("analysis", analysisId, payload);

  // Approving settles anything the officer had previously asked for.
  if (action === "Approved" && canAdvance) {
    const user = await getCurrentUser();
    await resolveOpenReviewComments(analysisId, user?.id ?? null);
  }
}

/** Set submission status to Under review + append a system note (no backwards move). */
export async function markAnalysisUnderReview(
  analysisId: string,
): Promise<void> {
  await applyReviewAction(analysisId, "Under review");
}

/** Set submission status to Approved + append a system note (no backwards move). */
export async function approveAnalysis(analysisId: string): Promise<void> {
  await applyReviewAction(analysisId, "Approved");
}

/**
 * Open-report flow: mark under review when the officer actually opens the report.
 * Safe to call repeatedly.
 */
export async function openReportForReview(
  notification: AppNotification,
): Promise<void> {
  const analysisId = notification.payload.analysis_id;
  if (analysisId) {
    await markAnalysisUnderReview(analysisId);
  }
}

/* ------------------------------------------------------------------ */
/*  Review comments                                                   */
/* ------------------------------------------------------------------ */

export type ReviewCommentWithAuthor = AnalysisReviewComment & {
  author_name: string | null;
};

/** Review comments for one analysis, newest first. */
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
      author_name: author?.name?.trim() || null,
    };
  });
}

async function resolveOpenReviewComments(
  analysisId: string,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("analysis_review_comment")
    .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("analysis_id", analysisId)
    .is("resolved_at", null);

  if (error) {
    // Non-fatal: the status change is what drives the workflow.
    console.error("Failed to resolve review comments:", error);
  }
}

export type RequestChangesResult = {
  /** False when the record has no assignee — the comment saved, nobody was pinged. */
  notifiedAssignee: boolean;
};

/**
 * Send a report back to its assignee with a comment.
 *
 * Goes through an RPC because `notifications` rejects client inserts, and
 * because the comment, the status change and the alert have to land together.
 */
export async function requestAnalysisChanges(
  analysisId: string,
  body: string,
): Promise<RequestChangesResult> {
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
    .select("id, status_of_completion, status_of_submission, notes")
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

  const actor = await getActorDisplayName("Assignee");
  const date = new Date().toISOString().slice(0, 10);
  const nextNotes = appendSystemNote(
    analysis.notes,
    `System: Resubmitted for approval by ${actor} on ${date}`,
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
  await resolveOpenReviewComments(analysisId, user?.id ?? null);
}
