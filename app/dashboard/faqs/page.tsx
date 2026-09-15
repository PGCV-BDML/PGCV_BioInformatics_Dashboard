"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  History,
  MessagesSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { EmptyState, ErrorState, LoadingState } from "../../components/state-views";
import Pagination from "../../components/pagination";
import FaqArticleModal from "../../components/faq-article-modal";
import FaqArticleHistoryModal from "../../components/faq-article-history-modal";
import DeleteModal from "../../components/deletemodal";
import { CategoryChips } from "../../components/category-chips";
import { MarkdownBody } from "../../components/markdown-body";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { usePortal } from "../../components/portal-context";
import { useToast } from "../../components/toast";
import { faqsBreadcrumbs } from "@/lib/breadcrumbs";
import { describeDeleteError, describeSaveError } from "@/lib/db-errors";
import {
  FAQ_TAG_LABELS,
  FAQ_TAG_OPTIONS,
  FAQ_TAG_STYLES,
} from "@/lib/faq-tags";
import {
  articleHasHistory,
  articleMatchesSearch,
  articleMatchesTags,
  canAddFaqArticle,
  canDeleteFaqArticle,
  canUpdateFaqArticle,
  createFaqArticle,
  deleteFaqArticle,
  emptyFaqArticleForm,
  formFromFaqArticle,
  formatFaqLastUpdated,
  listFaqArticles,
  updateFaqArticle,
  type FaqArticleListItem,
} from "@/lib/faq-articles";
import { routes } from "@/lib/routes";
import type { FaqArticleFormData, FaqTag } from "@/types/database";

const ITEMS_PER_PAGE = 10;

export default function FaqsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 mx-auto font-aileron max-w-[1240px]">
          <LoadingState message="Loading FAQs…" />
        </div>
      }
    >
      <FaqsPageContent />
    </Suspense>
  );
}

function FaqsPageContent() {
  const [articles, setArticles] = useState<FaqArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<FaqTag[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<FaqArticleListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<FaqArticleListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyArticle, setHistoryArticle] = useState<FaqArticleListItem | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const { profile, realRole } = usePortal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addParam = searchParams.get("add") === "1";
  const canAdd = canAddFaqArticle(realRole);
  const canEdit = canUpdateFaqArticle(realRole);
  const modalOpen = isAdding || Boolean(editing);
  const historyOpen = Boolean(historyArticle);

  useEffect(() => {
    toggleSidebar(modalOpen || historyOpen);
  }, [modalOpen, historyOpen, toggleSidebar]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setArticles(await listFaqArticles());
    } catch (error) {
      console.error("Failed to load FAQs:", error);
      setLoadError("Couldn't load FAQs. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (addParam && canAdd) {
      setHistoryArticle(null);
      setIsAdding(true);
    }
  }, [addParam, canAdd]);

  const filtered = useMemo(() => {
    return articles
      .filter((article) => {
        if (!articleMatchesTags(article, tagFilter)) return false;
        return articleMatchesSearch(article, searchQuery);
      })
      .sort(
        (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
      );
  }, [articles, tagFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tagFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, pageCount);
  const displayed = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const toggleTag = (tag: FaqTag) => {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const closeEditor = () => {
    setIsAdding(false);
    setEditing(null);
    if (addParam) router.replace(routes.faqs.list);
  };

  const openEditor = (article?: FaqArticleListItem) => {
    setHistoryArticle(null);
    if (article) {
      setIsAdding(false);
      setEditing(article);
    } else {
      setEditing(null);
      setIsAdding(true);
    }
  };

  const openHistory = (article: FaqArticleListItem) => {
    setIsAdding(false);
    setEditing(null);
    setHistoryArticle(article);
  };

  const handleSave = async (form: FaqArticleFormData) => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      if (editing) {
        await updateFaqArticle(editing.id, profile.id, form);
        showToast("FAQ updated.", "success");
      } else {
        await createFaqArticle(profile.id, form);
        showToast("FAQ saved.", "success");
      }
      closeEditor();
      await load();
    } catch (error) {
      showToast(describeSaveError(error, "faq_article"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteFaqArticle(deleting.id);
      showToast("FAQ deleted.", "success");
      setDeleting(null);
      await load();
    } catch (error) {
      showToast(describeDeleteError(error, "faq_article"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 mx-auto font-aileron max-w-[1240px]">
      <PageHeader
        breadcrumbTrail={faqsBreadcrumbs}
        title="FAQs"
        subtitle="Answered questions the team can reuse. Update the answer when the steps change."
        actions={
          canAdd ? (
            <button
              type="button"
              onClick={() => openEditor()}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full shadow-md transition-all font-quicksand"
            >
              <Plus className="w-4 h-4" />
              Add FAQ
            </button>
          ) : null
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <label className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search questions, answers, or tags"
              className="w-full h-11 pl-10 pr-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#4ec2bb] focus:ring-4 focus:ring-[#4ec2bb]/10 outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FAQ_TAG_OPTIONS.map((opt) => {
            const active = tagFilter.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border font-quicksand ${
                  active
                    ? `${FAQ_TAG_STYLES[opt.value]} ring-2 ring-[#2a7797]/25`
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {loadError ? (
          <ErrorState message={loadError} onRetry={() => void load()} />
        ) : isLoading ? (
          <LoadingState message="Loading FAQs…" />
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={articles.length === 0 ? "No FAQs yet" : "No matching FAQs"}
            description={
              articles.length === 0
                ? "Add a question and its answer so the team has a reference."
                : "Try another tag or search. If it is not in the catalog, ask the team in the Forum."
            }
            action={
              canAdd && articles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openEditor()}
                  className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ
                </button>
              ) : articles.length > 0 ? (
                <Link
                  href={routes.forum.list}
                  className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full"
                >
                  <MessagesSquare className="w-3.5 h-3.5" /> Ask in the Forum
                </Link>
              ) : null
            }
          />
        ) : (
          <ul className="space-y-3">
            {displayed.map((article) => {
              const canDelete = canDeleteFaqArticle(
                realRole,
                profile?.id,
                article.author_id,
              );
              return (
                <li key={article.id}>
                  <details className="group rounded-[24px] border border-slate-200 bg-white open:bg-slate-50/60">
                    <summary className="list-none cursor-pointer px-4 py-4 md:px-5 flex items-start gap-3 [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="w-4 h-4 mt-1 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {article.title}
                        </h2>
                        <CategoryChips
                          categories={article.tags ?? []}
                          labels={FAQ_TAG_LABELS}
                          styles={FAQ_TAG_STYLES}
                          maxVisible={4}
                        />
                        {articleHasHistory(article.revision_count) ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openHistory(article);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#2a7797] font-aileron text-left"
                          >
                            <History className="w-3 h-3 shrink-0" />
                            {formatFaqLastUpdated(
                              article.updated_at,
                              article.updated_by_name,
                            )}
                          </button>
                        ) : (
                          <p className="text-[11px] text-slate-400 font-aileron">
                            {formatFaqLastUpdated(
                              article.updated_at,
                              article.updated_by_name,
                            )}
                          </p>
                        )}
                      </div>
                      {canEdit || canDelete ? (
                        <div className="flex shrink-0 items-center gap-1">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openEditor(article);
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-quicksand"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setDeleting(article);
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 font-quicksand"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </summary>
                    <div className="px-4 pb-5 md:px-5 md:pl-[2.25rem]">
                      <MarkdownBody source={article.body} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > ITEMS_PER_PAGE ? (
          <Pagination
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={page}
            onPageChange={setCurrentPage}
          />
        ) : null}

        {loadError ? null : <FaqForumPrompt />}
      </div>

      <FaqArticleModal
        isOpen={modalOpen}
        isAdding={isAdding}
        isSaving={isSaving}
        initialData={
          editing ? formFromFaqArticle(editing) : emptyFaqArticleForm()
        }
        onClose={closeEditor}
        onSubmit={(form) => void handleSave(form)}
      />
      <FaqArticleHistoryModal
        article={historyArticle}
        onClose={() => setHistoryArticle(null)}
      />
      <DeleteModal
        isOpen={Boolean(deleting)}
        itemName={deleting?.title ?? "FAQ"}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function FaqForumPrompt() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[rgba(42,119,151,0.22)] bg-[#e6f4f8]/70 px-4 py-3">
      <MessagesSquare className="w-4 h-4 mt-0.5 shrink-0 text-[#2a7797]" />
      <p className="text-sm font-medium text-slate-600 font-aileron">
        Question not here?{" "}
        <Link
          href={routes.forum.list}
          className="font-bold text-[#2a7797] hover:text-[#1c5c59] underline underline-offset-2"
        >
          Ask it in the Forum
        </Link>
        .
      </p>
    </div>
  );
}
