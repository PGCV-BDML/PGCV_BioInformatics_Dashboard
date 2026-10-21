"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Lock,
  MessageSquare,
  Send,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  MAX_MESSAGE_LENGTH,
  formatDayDivider,
  formatMessageTime,
  getDefaultChannel,
  getProgramConversation,
  normalizeMessageBody,
  parseMessageBody,
  programIdFromPath,
  shouldGroupWithPrevious,
} from "@/lib/chat";
import { getCurrentUser } from "@/lib/supabase";
import { useChatThread, type ChatThread } from "@/hooks/useChatThread";
import { usePortal } from "./portal-context";
import type { Conversation, ProgramConversation } from "@/types/database";

type ChatTab = "program" | "team";

/**
 * Floating chat. Staff get the team channel everywhere. On a program's
 * pages, staff and that program's enrolled learners also get the
 * program chat; RLS decides who can load it.
 */
export function ChatPanel() {
  const pathname = usePathname();
  const { isStaff, isLearnerView } = usePortal();
  const programId = programIdFromPath(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamChannel, setTeamChannel] = useState<Conversation | null>(null);
  const [loadedProgram, setLoadedProgram] = useState<{
    programId: string;
    chat: ProgramConversation | null;
  } | null>(null);
  // The tab picked on one program's pages. Moving to another program,
  // or off one, falls back to the default rather than carrying it over.
  const [tabChoice, setTabChoice] = useState<{
    programId: string | null;
    tab: ChatTab;
  } | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUserId(u?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDefaultChannel().then((c) => {
      if (!cancelled) setTeamChannel(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    getProgramConversation(programId).then((chat) => {
      if (!cancelled) setLoadedProgram({ programId, chat });
    });
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const programChat =
    programId && loadedProgram?.programId === programId
      ? loadedProgram.chat
      : null;
  // Staff previewing the learner portal see what a learner would.
  const teamChat = isLearnerView ? null : teamChannel;

  const tabs: ChatTab[] = [];
  if (programChat) tabs.push("program");
  if (teamChat) tabs.push("team");
  const chosenTab = tabChoice?.programId === programId ? tabChoice.tab : null;
  const activeTab =
    chosenTab && tabs.includes(chosenTab) ? chosenTab : (tabs[0] ?? null);

  const programThread = useChatThread(
    programChat,
    userId,
    isOpen && activeTab === "program",
  );
  const teamThread = useChatThread(
    teamChat,
    userId,
    isOpen && activeTab === "team",
  );
  const threadFor = (tab: ChatTab) =>
    tab === "program" ? programThread : teamThread;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // No chat visible means the role has none here (RLS) or the
  // migrations have not run. Either way, render nothing.
  if (!userId || !activeTab) return null;

  const activeConversation = activeTab === "program" ? programChat : teamChat;
  if (!activeConversation) return null;

  const unreadTotal = programThread.unreadCount + teamThread.unreadCount;
  const programTitle = programChat?.program.title ?? "Program chat";

  function openPanel() {
    setIsOpen(true);
    if (activeTab) threadFor(activeTab).markRead();
  }

  function selectTab(tab: ChatTab) {
    setTabChoice({ programId, tab });
    threadFor(tab).markRead();
  }

  const tabLabel: Record<ChatTab, { label: string; icon: LucideIcon }> = {
    program: { label: programTitle, icon: GraduationCap },
    team: { label: teamChat?.name ?? "Team chat", icon: Users },
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={openPanel}
          aria-label={`Open chat${unreadTotal > 0 ? ` (${unreadTotal} unread)` : ""}`}
          className="fixed bottom-5 right-5 z-[95] inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#2a7797] text-white shadow-[0_10px_30px_rgba(23,33,38,0.22)] hover:bg-[#1c5c59] transition-colors"
        >
          <MessageSquare className="w-5 h-5 stroke-[2.5]" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 leading-none">
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <section
          aria-label="Chat"
          className="fixed bottom-5 right-5 z-[95] flex flex-col w-[22rem] max-w-[calc(100vw-2.5rem)] h-[30rem] max-h-[calc(100vh-6rem)] bg-surface border border-[rgba(23,33,38,0.1)] rounded-2xl shadow-[0px_16px_40px_rgba(23,33,38,0.16)] overflow-hidden"
        >
          <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
            {tabs.length > 1 ? (
              <div
                role="tablist"
                aria-label="Chats"
                className="flex items-center gap-1 min-w-0"
              >
                {tabs.map((tab) => {
                  const { label, icon: Icon } = tabLabel[tab];
                  const isActive = tab === activeTab;
                  const unread = threadFor(tab).unreadCount;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => selectTab(tab)}
                      title={label}
                      // The program title gives way on narrow screens;
                      // the short team label keeps its width.
                      className={`inline-flex items-center gap-1.5 min-w-0 h-7 px-2.5 rounded-lg text-[11px] font-extrabold font-quicksand transition-colors ${
                        tab === "team" ? "flex-shrink-0" : ""
                      } ${
                        isActive
                          ? "bg-[#2a7797]/10 text-[#2a7797]"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[8.5rem]">{label}</span>
                      {!isActive && unread > 0 && (
                        <span className="min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 leading-none flex-shrink-0">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 px-1">
                {(() => {
                  const { label, icon: Icon } = tabLabel[activeTab];
                  return (
                    <>
                      <Icon className="w-3.5 h-3.5 text-[#2a7797] flex-shrink-0" />
                      <span
                        title={label}
                        className="text-[12px] font-extrabold text-[#1e293b] uppercase tracking-wider font-quicksand truncate"
                      >
                        {label}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {activeTab === "program" && (
            <p className="px-4 py-1.5 text-[10px] text-slate-500 bg-slate-50 border-b border-slate-100 font-aileron flex-shrink-0">
              Visible to this program&apos;s participants and PGC Visayas staff.
            </p>
          )}

          <ChatThreadView
            key={activeConversation.id}
            thread={threadFor(activeTab)}
            userId={userId}
            isProgramChat={activeTab === "program"}
            canModerate={activeTab === "program" && isStaff && !isLearnerView}
            isReadOnly={
              activeTab === "program" &&
              programChat?.program.status === "archived"
            }
          />
        </section>
      )}
    </>
  );
}

function ChatThreadView({
  thread,
  userId,
  isProgramChat,
  canModerate,
  isReadOnly,
}: {
  thread: ChatThread;
  userId: string;
  isProgramChat: boolean;
  /** Staff in a program chat may delete anyone's message. */
  canModerate: boolean;
  isReadOnly: boolean;
}) {
  const { messages, people } = thread;
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const body = normalizeMessageBody(draft);
    if (!body || isSending) return;

    setIsSending(true);
    // Clear optimistically; restore on failure so nothing is lost.
    setDraft("");
    try {
      await thread.send(body);
    } catch {
      setDraft(body);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleDelete(id: string) {
    setConfirmingId(null);
    try {
      await thread.remove(id);
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

  const remaining = MAX_MESSAGE_LENGTH - draft.trim().length;

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <MessageSquare className="w-6 h-6 opacity-40" />
            <p className="text-[12px] font-bold font-aileron">
              No messages yet
            </p>
            <p className="text-[11px] font-aileron">
              {isProgramChat
                ? "Ask a question or say hello to the group."
                : "Say hello to the team."}
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const previous = messages[i - 1];
            const grouped = shouldGroupWithPrevious(m, previous);
            const isMine = m.sender_id === userId;
            const sender = people.get(m.sender_id);
            const canDelete = !m.deleted_at && (isMine || canModerate);
            const showDivider =
              !previous ||
              formatDayDivider(previous.created_at) !==
                formatDayDivider(m.created_at);

            const deleteButton = canDelete && (
              <button
                type="button"
                onClick={() => setConfirmingId(m.id)}
                aria-label="Delete message"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-slate-300 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            );

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
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500 font-aileron mb-0.5 ml-1 min-w-0">
                        <span className="truncate">
                          {sender?.name ?? "Unknown"}
                        </span>
                        {isProgramChat && sender?.is_staff && (
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#2a7797] bg-[#2a7797]/10 rounded px-1 py-px flex-shrink-0">
                            Staff
                          </span>
                        )}
                      </span>
                    )}

                    <div className="flex items-end gap-1.5 min-w-0">
                      {isMine && deleteButton}

                      <div
                        className={`min-w-0 max-w-full rounded-2xl px-3 py-1.5 text-[12px] font-aileron leading-snug whitespace-pre-wrap wrap-anywhere ${
                          m.deleted_at
                            ? "bg-slate-50 text-slate-400 italic border border-slate-100"
                            : isMine
                              ? "bg-[#2a7797] text-white"
                              : "bg-slate-100 text-[#1e293b]"
                        }`}
                      >
                        {m.deleted_at ? "Message deleted" : (
                          <MessageBody body={m.body} isMine={isMine} />
                        )}
                      </div>

                      {!isMine && deleteButton}
                    </div>

                    {confirmingId === m.id ? (
                      <div className="flex items-center gap-2 mt-1 mx-1 text-[10px] font-aileron">
                        <span className="text-slate-500">Delete for everyone?</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(m.id)}
                          className="font-extrabold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="font-bold text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-aileron mt-0.5 mx-1">
                        {formatMessageTime(m.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isReadOnly ? (
        <p className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500 font-aileron flex-shrink-0">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          This program is archived, so its chat is read-only.
        </p>
      ) : (
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
      )}
    </>
  );
}

function MessageBody({ body, isMine }: { body: string; isMine: boolean }) {
  return (
    <>
      {parseMessageBody(body).map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.value}</span>;
        }

        return (
          <a
            key={i}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`break-all underline underline-offset-2 ${
              isMine
                ? "text-white decoration-white/70 hover:decoration-white"
                : "text-[#2a7797] decoration-[#2a7797]/70 hover:text-[#1c5c59]"
            }`}
          >
            {segment.value}
          </a>
        );
      })}
    </>
  );
}
