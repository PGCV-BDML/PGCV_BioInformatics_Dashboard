"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  countUnread,
  deleteMessage,
  getConversationPeople,
  getLastReadAt,
  getMessages,
  markConversationRead,
  mergeMessage,
  sendMessage,
  subscribeToMessages,
} from "@/lib/chat";
import type { ChatMessage, ChatPerson, Conversation } from "@/types/database";

interface ThreadState {
  conversationId: string;
  messages: ChatMessage[];
  lastReadAt: string | null;
  people: Map<string, ChatPerson>;
}

export interface ChatThread {
  messages: ChatMessage[];
  /** Display names and staff flags, keyed by user id. */
  people: Map<string, ChatPerson>;
  unreadCount: number;
  /** Move the read bookmark to now. */
  markRead: () => void;
  /** Throws when the database rejects the message. */
  send: (body: string) => Promise<void>;
  /** Throws when the message could not be deleted. */
  remove: (messageId: string) => Promise<void>;
}

const NO_MESSAGES: ChatMessage[] = [];
const NO_PEOPLE = new Map<string, ChatPerson>();

/**
 * One conversation's messages, names, unread count and realtime feed.
 * Pass a null conversation to stay idle. While `isVisible` (the panel
 * is open on this thread), arriving messages count as read.
 */
export function useChatThread(
  conversation: Conversation | null,
  userId: string | null,
  isVisible: boolean,
): ChatThread {
  const conversationId = conversation?.id ?? null;
  const [state, setState] = useState<ThreadState | null>(null);
  // The realtime callback closes over its first render, so it reads
  // "is this thread on screen right now?" from a ref.
  const isVisibleRef = useRef(isVisible);
  const askedForSenderRef = useRef(new Set<string>());

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // State left over from another conversation is ignored rather than
  // reset, so switching never shows the old thread under a new header.
  const current = state?.conversationId === conversationId ? state : null;
  const messages = current?.messages ?? NO_MESSAGES;
  const people = current?.people ?? NO_PEOPLE;

  const updateCurrent = useCallback(
    (update: (prev: ThreadState) => ThreadState) => {
      setState((prev) =>
        prev && prev.conversationId === conversationId ? update(prev) : prev,
      );
    },
    [conversationId],
  );

  const markRead = useCallback(() => {
    if (!conversationId || !userId) return;
    void markConversationRead(conversationId, userId);
    const now = new Date().toISOString();
    updateCurrent((prev) => ({ ...prev, lastReadAt: now }));
  }, [conversationId, userId, updateCurrent]);

  useEffect(() => {
    if (!conversationId || !userId) return;
    let cancelled = false;

    void (async () => {
      const [loaded, bookmark] = await Promise.all([
        getMessages(conversationId),
        getLastReadAt(conversationId, userId),
      ]);
      const names = await getConversationPeople(
        conversationId,
        loaded.map((m) => m.sender_id),
      );
      if (cancelled) return;
      setState({ conversationId, messages: loaded, lastReadAt: bookmark, people: names });
      if (isVisibleRef.current) markRead();
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, userId, markRead]);

  // Realtime covers inserts and soft-delete updates alike. A message
  // that lands while the thread is on screen is already read, so the
  // bookmark moves here rather than in an effect on the unread count.
  useEffect(() => {
    if (!conversationId) return;

    return subscribeToMessages(conversationId, (incoming) => {
      updateCurrent((prev) => ({
        ...prev,
        messages: mergeMessage(prev.messages, incoming),
      }));
      if (isVisibleRef.current && incoming.sender_id !== userId) markRead();
    });
  }, [conversationId, userId, markRead, updateCurrent]);

  // Someone posting for the first time (a staff member in a program
  // chat, say) is not in the names yet. Ask once per person.
  const missingSender =
    messages.find((m) => !people.has(m.sender_id))?.sender_id ?? null;

  useEffect(() => {
    if (!conversationId || !missingSender) return;
    const key = `${conversationId}:${missingSender}`;
    if (askedForSenderRef.current.has(key)) return;
    askedForSenderRef.current.add(key);

    void getConversationPeople(
      conversationId,
      messages.map((m) => m.sender_id),
    ).then((names) => updateCurrent((prev) => ({ ...prev, people: names })));
  }, [conversationId, missingSender, messages, updateCurrent]);

  const send = useCallback(
    async (body: string) => {
      if (!conversationId || !userId) return;
      const sent = await sendMessage(conversationId, userId, body);
      if (sent) {
        updateCurrent((prev) => ({
          ...prev,
          messages: mergeMessage(prev.messages, sent),
        }));
      }
    },
    [conversationId, userId, updateCurrent],
  );

  const remove = useCallback(
    async (messageId: string) => {
      const removed = await deleteMessage(messageId);
      updateCurrent((prev) => ({
        ...prev,
        messages: mergeMessage(prev.messages, removed),
      }));
    },
    [updateCurrent],
  );

  return {
    messages,
    people,
    unreadCount: userId
      ? countUnread(messages, current?.lastReadAt ?? null, userId)
      : 0,
    markRead,
    send,
    remove,
  };
}
