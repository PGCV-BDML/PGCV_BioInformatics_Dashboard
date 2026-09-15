"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleHelp,
  Lock,
  LockOpen,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../../components/pageheader";
import { EmptyState, ErrorState, LoadingState } from "../../../components/state-views";
import { CategoryChips } from "../../../components/category-chips";
import { MarkdownBody } from "../../../components/markdown-body";
import { FaqPostComposer } from "../../../components/faq-post-composer";
import FaqAskModal from "../../../components/faq-ask-modal";
import DeleteModal from "../../../components/deletemodal";
import { useDashboardUI } from "../../../components/dashboard-ui-context";
import { usePortal } from "../../../components/portal-context";
import { useToast } from "../../../components/toast";
import { forumDetailBreadcrumbs } from "@/lib/breadcrumbs";
import { describeSaveError } from "@/lib/db-errors";
import { FAQ_TAG_LABELS, FAQ_TAG_STYLES } from "@/lib/faq-tags";
import {
  answersOf,
  canAcceptFaqAnswer,
  canAskFaq,
  canCloseFaqThread,
  canDeleteFaqThread,
  canEditFaqPost,
  canManageFaqThread,
  canPostFaqAnswer,
  canPostFaqComment,
  commentsOf,
  createFaqPost,
  deleteFaqThread,
  faqStatusLabel,
  formFromFaqThread,
  formatFaqTime,
  getFaqPosts,
  getFaqThread,
  MAX_FAQ_COMMENT,
  setFaqAcceptedAnswer,
  setFaqThreadStatus,
  softDeleteFaqPost,
  sortFaqAnswers,
  threadHasAnswers,
  updateFaqThread,
} from "@/lib/faqs";
import { routes } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import type { FaqPost, FaqThread, FaqThreadFormData, UserRole } from "@/types/database";

export default function FaqThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FaqThreadPageContent threadId={id} />;
}

function FaqThreadPageContent({ threadId }: { threadId: string }) {
  const [thread, setThread] = useState<FaqThread | null>(null);
  const [posts, setPosts] = useState<FaqPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answerBody, setAnswerBody] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [savingCommentFor, setSavingCommentFor] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const { profile, realRole } = usePortal();
  const router = useRouter();

  useEffect(() => {
    toggleSidebar(isEditing);
  }, [isEditing, toggleSidebar]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextThread, nextPosts] = await Promise.all([
        getFaqThread(threadId),
        getFaqPosts(threadId),
      ]);
      setThread(nextThread);
      setPosts(nextPosts);
    } catch (error) {
      console.error("Failed to load FAQ thread:", error);
      setLoadError("Couldn't load this question. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`faq-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "faq_post",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          void getFaqPosts(threadId).then(setPosts);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "faq_thread",
          filter: `id=eq.${threadId}`,
        },
        () => {
          void getFaqThread(threadId).then((next) => {
            if (next) setThread(next);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  const livePosts = useMemo(
    () => posts.filter((post) => !post.deleted_at),
    [posts],
  );
  const answers = useMemo(
    () => sortFaqAnswers(answersOf(livePosts), thread?.accepted_post_id ?? null),
    [livePosts, thread?.accepted_post_id],
  );
  const hasAnswers = threadHasAnswers(livePosts);
  const canEditQuestion = thread
    ? canManageFaqThread(realRole, profile?.id, thread.author_id)
    : false;
  const canClose = thread
    ? canCloseFaqThread(realRole, profile?.id, thread.author_id)
    : false;
  const canDelete = thread
    ? canDeleteFaqThread(realRole, profile?.id, thread.author_id, hasAnswers)
    : false;
  const canAccept = thread
    ? canAcceptFaqAnswer(realRole, profile?.id, thread.author_id)
    : false;
  const canAnswer = thread ? canPostFaqAnswer(realRole, thread.status) : false;
  const canComment = canPostFaqComment(realRole);

  const handleSaveEdit = async (form: FaqThreadFormData) => {
    if (!thread) return;
    setIsSavingEdit(true);
    try {
      await updateFaqThread(thread.id, form);
      const next = await getFaqThread(thread.id);
      if (next) setThread(next);
      setIsEditing(false);
      showToast("Question updated.", "success");
    } catch (error) {
      showToast(describeSaveError(error, "faq_thread"), "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!thread) return;
    const next = thread.status === "open" ? "closed" : "open";
    try {
      await setFaqThreadStatus(thread.id, next);
      setThread((prev) => (prev ? { ...prev, status: next } : prev));
      showToast(
        next === "closed"
          ? "Question closed. Comments on answers can still be added."
          : "Question reopened.",
        "success",
      );
    } catch (error) {
      showToast(describeSaveError(error, "faq_thread"), "error");
    }
  };

  const handleDelete = async () => {
    if (!thread) return;
    setIsDeleting(true);
    try {
      await deleteFaqThread(thread.id);
      showToast("Question deleted.", "success");
      router.push(routes.forum.list);
    } catch (error) {
      showToast(describeSaveError(error, "faq_thread"), "error");
      setIsDeleting(false);
    }
  };

  const handleAnswer = async () => {
    if (!thread || !profile?.id) return;
    setIsSavingAnswer(true);
    try {
      const posted = await createFaqPost({
        threadId: thread.id,
        authorId: profile.id,
        kind: "answer",
        body: answerBody,
      });
      setPosts((prev) => [...prev, { ...posted, author_name: profile.name }]);
      setAnswerBody("");
      showToast("Answer posted.", "success");
    } catch (error) {
      showToast(describeSaveError(error, "faq_post"), "error");
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleComment = async (parentId: string) => {
    if (!thread || !profile?.id) return;
    const body = commentDrafts[parentId] ?? "";
    setSavingCommentFor(parentId);
    try {
      const posted = await createFaqPost({
        threadId: thread.id,
        authorId: profile.id,
        kind: "comment",
        body,
        parentId,
      });
      setPosts((prev) => [...prev, { ...posted, author_name: profile.name }]);
      setCommentDrafts((prev) => ({ ...prev, [parentId]: "" }));
      showToast("Comment posted.", "success");
    } catch (error) {
      showToast(describeSaveError(error, "faq_post"), "error");
    } finally {
      setSavingCommentFor(null);
    }
  };

  const handleAccept = async (postId: string) => {
    if (!thread) return;
    const next = thread.accepted_post_id === postId ? null : postId;
    try {
      await setFaqAcceptedAnswer(thread.id, next);
      setThread((prev) => (prev ? { ...prev, accepted_post_id: next } : prev));
    } catch (error) {
      showToast(describeSaveError(error, "faq_thread"), "error");
    }
  };

  const handleDeletePost = async (post: FaqPost) => {
    try {
      await softDeleteFaqPost(post.id);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, deleted_at: new Date().toISOString() }
            : item,
        ),
      );
    } catch (error) {
      showToast(describeSaveError(error, "faq_post"), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 mx-auto font-aileron max-w-[900px]">
        <LoadingState message="Loading question…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-8 mx-auto font-aileron max-w-[900px]">
        <ErrorState message={loadError} onRetry={() => void load()} />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="space-y-8 mx-auto font-aileron max-w-[900px]">
        <EmptyState
          icon={CircleHelp}
          title="Question not found"
          description="It may have been deleted, or the link is stale."
          action={
            <Link
              href={routes.forum.list}
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#2a7797] text-white text-xs font-bold rounded-full"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Forum
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto font-aileron max-w-[900px]">
      <PageHeader
        breadcrumbTrail={forumDetailBreadcrumbs(thread.title)}
        title={thread.title}
        subtitle={`${faqStatusLabel(thread.status)} · ${answers.length} ${answers.length === 1 ? "answer" : "answers"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={routes.forum.list}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All threads
            </Link>
            {canClose ? (
              <button
                type="button"
                onClick={() => void handleToggleStatus()}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {thread.status === "open" ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Close
                  </>
                ) : (
                  <>
                    <LockOpen className="w-3.5 h-3.5" /> Reopen
                  </>
                )}
              </button>
            ) : null}
            {canEditQuestion && canAskFaq(realRole) ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : null}
          </div>
        }
      />

      {thread.status === "closed" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          This question is closed, so new answers are off. Comments on answers
          are still welcome.
        </div>
      ) : null}

      <article className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-6 shadow-xl shadow-slate-400/10 space-y-4">
        <CategoryChips
          categories={thread.tags ?? []}
          labels={FAQ_TAG_LABELS}
          styles={FAQ_TAG_STYLES}
          maxVisible={8}
          size="sm"
        />
        <MarkdownBody source={thread.body} />
        <p className="text-[11px] text-slate-400">
          Asked {formatFaqTime(thread.created_at)}
        </p>
      </article>

      <section className="space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#2a7797] font-quicksand flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
        </h2>

        {answers.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No answers yet"
            description={
              canAnswer
                ? "Share the command, protocol, or reasoning that unblocked you."
                : "This question is closed to new answers."
            }
          />
        ) : (
          answers.map((answer) => {
            const accepted = thread.accepted_post_id === answer.id;
            return (
              <article
                key={answer.id}
                className={`rounded-[24px] border p-5 md:p-6 shadow-xl shadow-slate-400/10 space-y-4 ${
                  accepted
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-300/70 bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">
                    {answer.author_name || "Staff"} · {formatFaqTime(answer.created_at)}
                  </p>
                  <div className="flex items-center gap-2">
                    {accepted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 font-quicksand">
                        <BadgeCheck className="w-3 h-3" /> Accepted
                      </span>
                    ) : null}
                    {canAccept ? (
                      <button
                        type="button"
                        onClick={() => void handleAccept(answer.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 hover:text-emerald-950 font-quicksand"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {accepted ? "Unaccept" : "Accept"}
                      </button>
                    ) : null}
                    {canEditFaqPost(realRole, profile?.id, answer.author_id) ? (
                      <button
                        type="button"
                        onClick={() => void handleDeletePost(answer)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-800 font-quicksand"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    ) : null}
                  </div>
                </div>
                <MarkdownBody source={answer.body} />
                <CommentList
                  comments={commentsOf(livePosts, answer.id)}
                  currentUserId={profile?.id}
                  role={realRole}
                  onDelete={handleDeletePost}
                />
                {canComment ? (
                  <CommentBox
                    value={commentDrafts[answer.id] ?? ""}
                    onChange={(value) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [answer.id]: value,
                      }))
                    }
                    isSaving={savingCommentFor === answer.id}
                    onSubmit={() => void handleComment(answer.id)}
                  />
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {canAnswer ? (
        <section className="bg-surface border border-slate-300/70 rounded-[24px] p-5 md:p-6 shadow-xl shadow-slate-400/10 space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#2a7797] font-quicksand">
            Your answer
          </h2>
          <FaqPostComposer
            value={answerBody}
            onChange={setAnswerBody}
            rows={8}
          />
          <button
            type="button"
            disabled={isSavingAnswer || !answerBody.trim()}
            onClick={() => void handleAnswer()}
            className="inline-flex items-center justify-center h-11 px-5 bg-[#2a7797] hover:bg-[#1c5c59] disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md"
          >
            {isSavingAnswer ? "Posting…" : "Post answer"}
          </button>
        </section>
      ) : null}

      <FaqAskModal
        isOpen={isEditing}
        isAdding={false}
        isSaving={isSavingEdit}
        initialData={formFromFaqThread(thread)}
        onClose={() => setIsEditing(false)}
        onSubmit={(form) => void handleSaveEdit(form)}
      />
      <DeleteModal
        isOpen={showDelete}
        itemName={thread.title}
        onClose={() => setShowDelete(false)}
        onConfirm={() => void handleDelete()}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function CommentList({
  comments,
  currentUserId,
  role,
  onDelete,
}: {
  comments: FaqPost[];
  currentUserId: string | undefined;
  role: UserRole | null;
  onDelete: (post: FaqPost) => void;
}) {
  if (comments.length === 0) return null;
  return (
    <ul className="space-y-3 border-t border-slate-100 pt-3">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <MarkdownBody source={comment.body} className="text-[13px]" />
              <p className="mt-1 text-[10px] text-slate-400">
                {comment.author_name || "Staff"} · {formatFaqTime(comment.created_at)}
              </p>
            </div>
            {canEditFaqPost(role, currentUserId, comment.author_id) ? (
              <button
                type="button"
                onClick={() => onDelete(comment)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-600"
              >
                Delete
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommentBox({
  value,
  onChange,
  isSaving,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        maxLength={MAX_FAQ_COMMENT}
        rows={3}
        placeholder="Add a comment. Markdown and links are supported."
        onChange={(event) => onChange(event.target.value)}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#4ec2bb] focus:ring-4 focus:ring-[#4ec2bb]/10 outline-none resize-y"
      />
      <button
        type="button"
        disabled={isSaving || !value.trim()}
        onClick={onSubmit}
        className="inline-flex items-center h-9 px-3 rounded-full border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-quicksand"
      >
        {isSaving ? "Posting…" : "Comment"}
      </button>
    </div>
  );
}
