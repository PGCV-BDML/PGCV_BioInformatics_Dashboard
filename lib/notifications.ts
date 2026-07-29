import { supabase, getCurrentUser, saveDataToDB } from "@/lib/supabase";
import {
  deriveLegacyStatus,
  shouldAdvanceSubmissionStatus,
} from "@/lib/analysis-tracker";

export type AppNotification = {
  id: string;
  type: string;
  payload: {
    analysis_id?: string;
    client_name?: string | null;
    service_report_number?: string | null;
    service_report_link?: string | null;
  };
  target_user_id: string;
  is_read: boolean;
  email_sent_at: string | null;
  created_at: string;
};

export type ReviewAction = "Under review" | "Approved";

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
  return (data ?? []) as AppNotification[];
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

async function getActorDisplayName(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "Approving officer";

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
    meta?.full_name?.trim() ||
    meta?.name?.trim() ||
    user.email ||
    "Approving officer"
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
