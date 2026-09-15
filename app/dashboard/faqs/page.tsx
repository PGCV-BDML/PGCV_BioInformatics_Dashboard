"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { EmptyState, ErrorState, LoadingState } from "../../components/state-views";
import Pagination from "../../components/pagination";
import FaqAskModal from "../../components/faq-ask-modal";
import { CategoryChips } from "../../components/category-chips";
import { useDashboardUI } from "../../components/dashboard-ui-context";
import { usePortal } from "../../components/portal-context";
import { useToast } from "../../components/toast";
import { faqsBreadcrumbs } from "@/lib/breadcrumbs";
import { describeSaveError } from "@/lib/db-errors";
import {
  FAQ_TAG_LABELS,
  FAQ_TAG_OPTIONS,
  FAQ_TAG_STYLES,
} from "@/lib/faq-tags";
import {
  canAskFaq,
  createFaqThread,
  emptyFaqForm,
  faqStatusLabel,
  formatFaqTime,
  listFaqThreads,
  threadMatchesSearch,
  threadMatchesTags,
  type FaqThreadListItem,
} from "@/lib/faqs";
import { routes } from "@/lib/routes";
import type { FaqStatus, FaqTag, FaqThreadFormData } from "@/types/database";

const ITEMS_PER_PAGE = 10;

const STATUS_FILTERS: { value: FaqStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

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
  const [threads, setThreads] = useState<FaqThreadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FaqStatus | "All">("All");
  const [tagFilter, setTagFilter] = useState<FaqTag[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { toggleSidebar } = useDashboardUI();
  const { showToast } = useToast();
  const { profile, realRole } = usePortal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addParam = searchParams.get("add") === "1";
  const canAsk = canAskFaq(realRole);

  useEffect(() => {
    toggleSidebar(isAdding);
  }, [isAdding, toggleSidebar]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await listFaqThreads();
      setThreads(rows);
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
    if (addParam && canAsk) setIsAdding(true);
  }, [addParam, canAsk]);

  const filtered = useMemo(() => {
    return threads
      .filter((thread) => {
        if (statusFilter !== "All" && thread.status !== statusFilter) {
          return false;
        }
        if (!threadMatchesTags(thread, tagFilter)) return false;
        return threadMatchesSearch(thread, searchQuery);
      })
      .sort(
        (a, b) =>
          Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at),
      );
  }, [threads, statusFilter, tagFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, tagFilter]);

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

  const closeAsk = () => {
    setIsAdding(false);
    if (addParam) router.replace(routes.faqs.list);
  };

  const handleCreate = async (form: FaqThreadFormData) => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const created = await createFaqThread(profile.id, form);
      showToast("Question posted.", "success");
      closeAsk();
      router.push(routes.faqs.byId(created.id));
    } catch (error) {
      showToast(describeSaveError(error, "faq_thread"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 mx-auto font-aileron max-w-[1240px]">
      <PageHeader
        breadcrumbTrail={faqsBreadcrumbs}
        title="FAQs"
        subtitle="Staff Q&A for pipelines, installs, and lab troubleshooting."
        actions={
          canAsk ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full shadow-md transition-all font-quicksand"
            >
              <Plus className="w-4 h-4" />
              Ask a question
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
              placeholder="Search questions, tags, or authors"
              className="w-full h-11 pl-10 pr-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#4ec2bb] focus:ring-4 focus:ring-[#4ec2bb]/10 outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`h-9 px-3 rounded-full text-[10px] font-extrabold uppercase tracking-wider border font-quicksand ${
                    active
                      ? "bg-[#2a7797] text-white border-[#2a7797]"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
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
            icon={Inbox}
            title={threads.length === 0 ? "No questions yet" : "No matching questions"}
            description={
              threads.length === 0
                ? "Ask the first question so the team has a place to look."
                : "Try another tag, status, or search."
            }
            action={
              canAsk && threads.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#2a7797] hover:bg-[#1c5c59] text-white text-xs font-bold rounded-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Ask a question
                </button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {displayed.map((thread) => (
              <li key={thread.id}>
                <Link
                  href={routes.faqs.byId(thread.id)}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 py-4 hover:bg-slate-50/80 rounded-2xl px-2 -mx-2 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider font-quicksand ${
                          thread.status === "closed"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
                        }`}
                      >
                        {faqStatusLabel(thread.status)}
                      </span>
                      <h2 className="text-base font-bold text-slate-900 truncate">
                        {thread.title}
                      </h2>
                    </div>
                    <CategoryChips
                      categories={thread.tags ?? []}
                      labels={FAQ_TAG_LABELS}
                      styles={FAQ_TAG_STYLES}
                      maxVisible={4}
                    />
                    <p className="text-[11px] text-slate-400 font-aileron">
                      {thread.author_name || "Staff"} · {formatFaqTime(thread.last_activity_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold font-aileron sm:pt-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {thread.answer_count}{" "}
                    {thread.answer_count === 1 ? "answer" : "answers"}
                  </div>
                </Link>
              </li>
            ))}
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
      </div>

      <FaqAskModal
        isOpen={isAdding}
        isAdding
        isSaving={isSaving}
        initialData={emptyFaqForm()}
        onClose={closeAsk}
        onSubmit={(form) => void handleCreate(form)}
      />
    </div>
  );
}
