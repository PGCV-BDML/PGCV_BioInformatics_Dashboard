"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Trash2, Users } from "lucide-react";
import {
  MAX_MESSAGE_LENGTH,
  countUnread,
  deleteMessage,
  formatDayDivider,
  formatMessageTime,
  getDefaultChannel,
  getLastReadAt,
  getMessages,
  getSenderName,
  markConversationRead,
  mergeMessage,
  normalizeMessageBody,
  sendMessage,
  shouldGroupWithPrevious,
  subscribeToMessages,
} from "@/lib/chat";
import { getCurrentUser } from "@/lib/supabase";
import type { ChatMessage, Conversation } from "@/types/database";

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // The realtime callback closes over its first render, so it reads
  // "is the panel open right now?" from a ref rather than state.
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    getCurrentUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDefaultChannel().then((c) => {
      if (cancelled) return;
      setConversation(c);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!conversation || !userId) return;
    let cancelled = false;

    void (async () => {
      const [loaded, bookmark] = await Promise.all([
        getMessages(conversation.id),
        getLastReadAt(conversation.id, userId),
      ]);
      if (cancelled) return;
      setMessages(loaded);
      setLastReadAt(bookmark);
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation, userId]);

  const markRead = useCallback(() => {
    if (!conversation || !userId) return;
    void markConversationRead(conversation.id, userId);
    setLastReadAt(new Date().toISOString());
  }, [conversation, userId]);

  // Realtime covers inserts and soft-delete updates alike. A message
  // that lands while the panel is open is already read, so the
  // bookmark moves here rather than in an effect on the unread count.
  useEffect(() => {
    if (!conversation) return;

    return subscribeToMessages(conversation.id, (incoming) => {
      void (async () => {
        const name = await getSenderName(incoming.sender_id);
        setMessages((prev) => mergeMessage(prev, { ...incoming, sender_name: name }));
        if (isOpenRef.current && incoming.sender_id !== userId) markRead();
      })();
    });
  }, [conversation, userId, markRead]);

  const unreadCount = userId ? countUnread(messages, lastReadAt, userId) : 0;

  function openPanel() {
    setIsOpen(true);
    markRead();
  }

  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [isOpen, messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSend() {
    const body = normalizeMessageBody(draft);
    if (!body || !conversation || !userId || isSending) return;

    setIsSending(true);
    // Clear optimistically; restore on failure so nothing is lost.
    setDraft("");
    try {
      const sent = await sendMessage(conversation.id, userId, body);
      if (sent) {
        const name = await getSenderName(userId);
        setMessages((prev) => mergeMessage(prev, { ...sent, sender_name: name }));
      }
    } catch {
      setDraft(body);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMessage(id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m,
        ),
      );
    } catch {
      // The error is already logged in lib/chat; the row stays as-is.
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // No channel visible means the role has no chat access (RLS) or
  // the migration has not run. Either way, render nothing.
  if (isLoading || !conversation || !userId) return null;

  const remaining = MAX_MESSAGE_LENGTH - draft.trim().length;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={openPanel}
          aria-label={`Open team chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className="fixed bottom-5 right-5 z-[95] inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#2a7797] text-white shadow-[0_10px_30px_rgba(23,33,38,0.22)] hover:bg-[#1c5c59] transition-colors"
        >
          <MessageSquare className="w-5 h-5 stroke-[2.5]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <section
          aria-label="Team chat"
          className="fixed bottom-5 right-5 z-[95] flex flex-col w-[22rem] max-w-[calc(100vw-2.5rem)] h-[30rem] max-h-[calc(100vh-6rem)] bg-surface border border-[rgba(23,33,38,0.1)] rounded-2xl shadow-[0px_16px_40px_rgba(23,33,38,0.16)] overflow-hidden"
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-3.5 h-3.5 text-[#2a7797] flex-shrink-0" />
              <span className="text-[12px] font-extrabold text-[#1e293b] uppercase tracking-wider font-quicksand truncate">
                {conversation.name ?? "Team chat"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close team chat"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <MessageSquare className="w-6 h-6 opacity-40" />
                <p className="text-[12px] font-bold font-aileron">
                  No messages yet
                </p>
                <p className="text-[11px] font-aileron">Say hello to the team.</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const previous = messages[i - 1];
                const grouped = shouldGroupWithPrevious(m, previous);
                const isMine = m.sender_id === userId;
                const showDivider =
                  !previous ||
                  formatDayDivider(previous.created_at) !==
                    formatDayDivider(m.created_at);

                return (
                  <div key={m.id}>
                    {showDivider && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 font-quicksand">
                          {formatDayDivider(m.created_at)}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                    )}

                    <div className={`group flex ${isMine ? "justify-end" : "justify-start"} ${grouped && !showDivider ? "mt-0.5" : "mt-2.5"}`}>
                      <div className={`max-w-[80%] min-w-0 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        {!grouped && !isMine && (
                          <span className="text-[10px] font-extrabold text-slate-500 font-aileron mb-0.5 ml-1 truncate">
                            {m.sender_name ?? "Unknown"}
                          </span>
                        )}

                        <div className="flex items-end gap-1.5">
                          {isMine && !m.deleted_at && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(m.id)}
                              aria-label="Delete message"
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-slate-300 hover:text-red-500 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}

                          <div
                            className={`rounded-2xl px-3 py-1.5 text-[12px] font-aileron leading-snug break-words ${
                              m.deleted_at
                                ? "bg-slate-50 text-slate-400 italic border border-slate-100"
                                : isMine
                                  ? "bg-[#2a7797] text-white"
                                  : "bg-slate-100 text-[#1e293b]"
                            }`}
                          >
                            {m.deleted_at ? "Message deleted" : m.body}
                          </div>
                        </div>

                        <span className="text-[9px] text-slate-400 font-aileron mt-0.5 mx-1">
                          {formatMessageTime(m.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 p-2.5 flex-shrink-0">
            <div className="flex items-end gap-2">
              <label htmlFor="chat-message-input" className="sr-only">
                Message
              </label>
              <textarea
                id="chat-message-input"
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message…"
                className="flex-1 resize-none max-h-24 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-aileron text-[#1e293b] placeholder:text-slate-400 focus:outline-none focus:border-[#2a7797] focus:ring-2 focus:ring-[#2a7797]/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!normalizeMessageBody(draft) || isSending}
                aria-label="Send message"
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#2a7797] text-white hover:bg-[#1c5c59] disabled:opacity-40 disabled:hover:bg-[#2a7797] transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {remaining < 200 && (
              <p
                className={`text-[10px] font-aileron mt-1 ml-1 ${remaining < 0 ? "text-red-500" : "text-slate-400"}`}
              >
                {remaining < 0
                  ? `${-remaining} characters over the limit`
                  : `${remaining} characters left`}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
