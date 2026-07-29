import { supabase } from "@/lib/supabase";

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

/** Fetch all unread notifications for the currently authenticated user. */
export async function getMyNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

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
