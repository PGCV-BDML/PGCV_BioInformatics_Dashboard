import { supabase } from "@/lib/supabase";
import type { ChatMessage, Conversation } from "@/types/database";

/** Newest-N window the panel keeps in memory. */
export const MESSAGE_PAGE_SIZE = 50;

/** Mirrors the length CHECK on public.message.body. */
export const MAX_MESSAGE_LENGTH = 4000;

// ---- Pure helpers (no network; unit-tested) -------------------

/**
 * Trim and reject what the database would reject anyway, so a bad
 * message never costs a round trip.
 */
export function normalizeMessageBody(raw: string): string | null {
  const body = raw.trim();
  if (!body) return null;
  if (body.length > MAX_MESSAGE_LENGTH) return null;
  return body;
}

/**
 * Messages a user has not seen: newer than their bookmark and not
 * their own. A null bookmark means they have never opened the
 * thread, so everything from other people counts.
 */
export function countUnread(
  messages: Pick<ChatMessage, "sender_id" | "created_at" | "deleted_at">[],
  lastReadAt: string | null,
  currentUserId: string,
): number {
  const readCutoff = lastReadAt ? Date.parse(lastReadAt) : null;
  return messages.filter((m) => {
    if (m.deleted_at) return false;
    if (m.sender_id === currentUserId) return false;
    if (readCutoff === null) return true;
    return Date.parse(m.created_at) > readCutoff;
  }).length;
}

/**
 * Insert a message in ascending created_at order, replacing any
 * existing row with the same id.
 *
 * Realtime and the initial fetch overlap: a message sent while the
 * fetch is in flight arrives twice. Keying by id makes both paths
 * idempotent, and re-sorting absorbs out-of-order delivery.
 */
export function mergeMessage(
  existing: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  const next = existing.filter((m) => m.id !== incoming.id);
  next.push(incoming);
  next.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return next;
}

/** Group consecutive messages from one sender within `windowMs`. */
export function shouldGroupWithPrevious(
  message: Pick<ChatMessage, "sender_id" | "created_at">,
  previous: Pick<ChatMessage, "sender_id" | "created_at"> | undefined,
  windowMs = 5 * 60 * 1000,
): boolean {
  if (!previous) return false;
  if (previous.sender_id !== message.sender_id) return false;
  return Date.parse(message.created_at) - Date.parse(previous.created_at) <= windowMs;
}

/** Short clock label for a message bubble. */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Day divider label: Today / Yesterday / a date. */
export function formatDayDivider(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

// ---- Data access ---------------------------------------------

/**
 * The default staff channel, seeded by the team-chat migration.
 * Returns null when the caller's role cannot see channels — RLS
 * filters the row out rather than erroring.
 */
export async function getDefaultChannel(): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversation")
    .select("*")
    .eq("kind", "channel")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load default channel:", error);
    return null;
  }

  return (data as Conversation | null) ?? null;
}

/** Newest messages first from the database, returned oldest-first for rendering. */
export async function getMessages(
  conversationId: string,
  limit = MESSAGE_PAGE_SIZE,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("message")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load messages:", error);
    return [];
  }

  const rows = (data ?? []) as ChatMessage[];
  return withSenderNames(rows.slice().reverse());
}

/**
 * Attach display names. `message` has no FK-embedded select here
 * because users is a separate RLS domain; one batched lookup keeps
 * it to a single extra round trip.
 */
async function withSenderNames(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
  if (senderIds.length === 0) return messages;

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", senderIds);

  if (error) {
    console.error("Failed to load message senders:", error);
    return messages;
  }

  const nameById = new Map(
    (data ?? []).map((u) => [u.id as string, (u.name as string | null) ?? null]),
  );

  return messages.map((m) => ({
    ...m,
    sender_name: nameById.get(m.sender_id) ?? null,
  }));
}

/** Look up one display name (for realtime arrivals from unknown senders). */
export async function getSenderName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load sender name:", error);
    return null;
  }
  return (data?.name as string | null) ?? null;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  rawBody: string,
): Promise<ChatMessage | null> {
  const body = normalizeMessageBody(rawBody);
  if (!body) return null;

  const { data, error } = await supabase
    .from("message")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single();

  if (error) {
    console.error("Failed to send message:", error);
    throw error;
  }

  return data as ChatMessage;
}

/** Soft delete — the row stays for the audit trail. */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("message")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    console.error("Failed to delete message:", error);
    throw error;
  }
}

/** Read the caller's last_read_at bookmark, if they have one. */
export async function getLastReadAt(
  conversationId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversation_member")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load read bookmark:", error);
    return null;
  }
  return (data?.last_read_at as string | null) ?? null;
}

/** Move the bookmark to now, creating it on first open. */
export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("conversation_member").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) {
    console.error("Failed to mark conversation read:", error);
  }
}

/**
 * Subscribe to inserts and updates on a conversation.
 * Returns an unsubscribe function — call it on unmount.
 */
export function subscribeToMessages(
  conversationId: string,
  onChange: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "message",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          onChange(payload.new as ChatMessage);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
