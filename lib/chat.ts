import { isStaffRole } from "@/lib/portal";
import { supabase } from "@/lib/supabase";
import type {
  ChatMessage,
  ChatPerson,
  Conversation,
  ProgramConversation,
  UserRole,
} from "@/types/database";

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

export type MessageBodySegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_FINDER = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_SOFT_PUNCTUATION = new Set([".", ",", ";", ":", "!", "?", "'", '"']);

function unmatchedCloser(url: string, open: string, close: string): boolean {
  let depth = 0;
  for (const char of url) {
    if (char === open) depth += 1;
    else if (char === close) depth -= 1;
  }
  return depth < 0;
}

/** Peel off punctuation that is almost never part of the URL itself. */
function trimUrlMatch(raw: string): string {
  let url = raw;

  while (url.length > 0) {
    const last = url.at(-1);
    if (!last) break;
    if (TRAILING_SOFT_PUNCTUATION.has(last)) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")" && unmatchedCloser(url, "(", ")")) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === "]" && unmatchedCloser(url, "[", "]")) {
      url = url.slice(0, -1);
      continue;
    }
    break;
  }

  return url;
}

function hrefFor(url: string): string | null {
  const candidate = /^www\./i.test(url) ? `https://${url}` : url;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Split a message into plain text and http(s) links so the panel can
 * render long URLs as wrapping, clickable anchors.
 */
export function parseMessageBody(body: string): MessageBodySegment[] {
  const segments: MessageBodySegment[] = [];
  const finder = new RegExp(URL_FINDER.source, "gi");
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = finder.exec(body)) !== null) {
    const url = trimUrlMatch(match[0]);
    const href = url ? hrefFor(url) : null;
    if (!href) continue;

    const urlStart = match.index;
    if (urlStart > cursor) {
      segments.push({ type: "text", value: body.slice(cursor, urlStart) });
    }
    segments.push({ type: "link", value: url, href });
    cursor = urlStart + url.length;
    finder.lastIndex = cursor;
  }

  if (cursor < body.length) {
    segments.push({ type: "text", value: body.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: body }];
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

const PROGRAM_PATH =
  /^\/dashboard\/(?:training|internship)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

/**
 * The program whose workspace a path belongs to, so the panel can
 * offer that program's chat on every one of its tabs. Only UUIDs
 * match; anything else is not a program page.
 */
export function programIdFromPath(pathname: string | null): string | null {
  return pathname?.match(PROGRAM_PATH)?.[1] ?? null;
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

/**
 * A program's chat, with the program title and status. Null when
 * the caller is not staff or enrolled in it — RLS filters it out.
 */
export async function getProgramConversation(
  programId: string,
): Promise<ProgramConversation | null> {
  const { data, error } = await supabase
    .from("conversation")
    .select("*, program:training_program(title, status, type)")
    .eq("kind", "program")
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load program chat:", error);
    return null;
  }
  if (!data?.program) return null;

  return data as ProgramConversation;
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
  return rows.slice().reverse();
}

/**
 * Display names for everyone in a conversation, keyed by user id.
 *
 * Goes through conversation_people() because learners cannot read
 * each other in users. If that function is missing (the program-chat
 * migration has not run), staff can still read each other directly,
 * so the team chat keeps its names.
 */
export async function getConversationPeople(
  conversationId: string,
  senderIds: string[],
): Promise<Map<string, ChatPerson>> {
  const { data, error } = await supabase.rpc("conversation_people", {
    conv_id: conversationId,
  });

  if (!error) {
    return new Map(((data ?? []) as ChatPerson[]).map((p) => [p.id, p]));
  }

  const ids = Array.from(new Set(senderIds));
  if (ids.length === 0) return new Map();

  const fallback = await supabase.from("users").select("id, name, role").in("id", ids);
  if (fallback.error) {
    console.error("Failed to load message senders:", fallback.error);
    return new Map();
  }

  return new Map(
    (fallback.data ?? []).map((u) => [
      u.id as string,
      {
        id: u.id as string,
        name: (u.name as string | null) ?? null,
        is_staff: isStaffRole(u.role as UserRole),
      },
    ]),
  );
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

/**
 * Soft delete — the row stays for the audit trail. In a program chat
 * the database also blanks the text. Returns the updated row; throws
 * if RLS left the message untouched.
 */
export async function deleteMessage(messageId: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("message")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to delete message:", error);
    throw error;
  }
  if (!data) {
    const denied = new Error("You can't delete this message.");
    console.error("Failed to delete message:", denied);
    throw denied;
  }

  return data as ChatMessage;
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
