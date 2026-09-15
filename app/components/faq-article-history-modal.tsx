"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, History, Tags, Type } from "lucide-react";
import SlideOverModal, { renderSectionLabel } from "./slidemodal";
import { CategoryChips } from "./category-chips";
import { MarkdownBody } from "./markdown-body";
import { ErrorState, LoadingState } from "./state-views";
import {
  formatFaqRevisionLabel,
  listFaqArticleRevisions,
  type FaqArticleListItem,
  type FaqArticleRevisionItem,
} from "@/lib/faq-articles";
import {
  diffFaqBodyLines,
  diffFaqTags,
  diffFaqTitle,
  faqDiffHasChanges,
  type DiffToken,
} from "@/lib/faq-article-diff";
import { FAQ_TAG_LABELS, FAQ_TAG_STYLES } from "@/lib/faq-tags";
import type { FaqTag } from "@/types/database";

type HistoryView = "diff" | "read";

interface FaqArticleHistoryModalProps {
  article: FaqArticleListItem | null;
  onClose: () => void;
}

function TitleDiff({ tokens }: { tokens: DiffToken[] }) {
  return (
    <p className="text-sm font-bold text-slate-900 leading-relaxed">
      {tokens.map((token, index) => {
        if (token.type === "remove") {
          return (
            <span
              key={index}
              className="rounded-sm bg-red-100 text-red-800 line-through decoration-red-400/80"
            >
              {token.value}
            </span>
          );
        }
        if (token.type === "add") {
          return (
            <span
              key={index}
              className="rounded-sm bg-emerald-100 text-emerald-900"
            >
              {token.value}
            </span>
          );
        }
        return <span key={index}>{token.value}</span>;
      })}
    </p>
  );
}

function BodyDiff({ tokens }: { tokens: DiffToken[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
      {tokens.map((token, index) => {
        const value = token.value || " ";
        if (token.type === "remove") {
          return (
            <div
              key={index}
              className="whitespace-pre-wrap break-words bg-red-50 px-2.5 py-1 font-mono text-[12px] leading-relaxed text-red-800 line-through decoration-red-300"
            >
              {value}
            </div>
          );
        }
        if (token.type === "add") {
          return (
            <div
              key={index}
              className="whitespace-pre-wrap break-words bg-emerald-50 px-2.5 py-1 font-mono text-[12px] leading-relaxed text-emerald-900"
            >
              {value}
            </div>
          );
        }
        return (
          <div
            key={index}
            className="whitespace-pre-wrap break-words px-2.5 py-1 font-mono text-[12px] leading-relaxed text-slate-700"
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}

function TagDiff({
  previous,
  current,
}: {
  previous: FaqTag[];
  current: FaqTag[];
}) {
  const diff = diffFaqTags(previous, current);
  if (diff.added.length === 0 && diff.removed.length === 0) {
    return (
      <CategoryChips
        categories={current}
        labels={FAQ_TAG_LABELS}
        styles={FAQ_TAG_STYLES}
        maxVisible={12}
      />
    );
  }

  const chipClass =
    "inline-flex items-center rounded-lg border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider font-quicksand";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {diff.unchanged.map((tag) => (
        <span key={tag} className={`${chipClass} ${FAQ_TAG_STYLES[tag]}`}>
          {FAQ_TAG_LABELS[tag]}
        </span>
      ))}
      {diff.added.map((tag) => (
        <span
          key={`add-${tag}`}
          className={`${chipClass} ${FAQ_TAG_STYLES[tag]} ring-2 ring-emerald-400/50`}
        >
          + {FAQ_TAG_LABELS[tag]}
        </span>
      ))}
      {diff.removed.map((tag) => (
        <span
          key={`rm-${tag}`}
          className={`${chipClass} bg-red-50 text-red-800 border-red-200/80 line-through opacity-80`}
        >
          − {FAQ_TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  );
}

export default function FaqArticleHistoryModal({
  article,
  onClose,
}: FaqArticleHistoryModalProps) {
  const isOpen = Boolean(article);
  const [revisions, setRevisions] = useState<FaqArticleRevisionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<HistoryView>("diff");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!article) {
      setRevisions([]);
      setSelectedId(null);
      setView("diff");
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setView("diff");

    void listFaqArticleRevisions(article.id)
      .then((rows) => {
        if (cancelled) return;
        setRevisions(rows);
        setSelectedId(rows[1]?.id ?? rows[0]?.id ?? null);
      })
      .catch((error) => {
        console.error("Failed to load FAQ versions:", error);
        if (!cancelled) {
          setLoadError("Couldn't load earlier versions. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [article]);

  const current = revisions[0] ?? null;
  const selected =
    revisions.find((row) => row.id === selectedId) ?? current;

  const titleTokens = useMemo(
    () =>
      selected && current
        ? diffFaqTitle(selected.title, current.title)
        : [],
    [selected, current],
  );
  const bodyTokens = useMemo(
    () =>
      selected && current
        ? diffFaqBodyLines(selected.body, current.body)
        : [],
    [selected, current],
  );
  const isCurrent = Boolean(selected && current && selected.id === current.id);
  const hasTitleChanges = faqDiffHasChanges(titleTokens);
  const hasBodyChanges = faqDiffHasChanges(bodyTokens);
  const tagDiff =
    selected && current ? diffFaqTags(selected.tags, current.tags) : null;
  const hasTagChanges = Boolean(
    tagDiff && (tagDiff.added.length > 0 || tagDiff.removed.length > 0),
  );
  const hasAnyChanges = hasTitleChanges || hasBodyChanges || hasTagChanges;

  return (
    <SlideOverModal
      isOpen={isOpen}
      onClose={onClose}
      title="FAQ history"
      subtitle="Earlier versions compared with the current answer. View only — nothing is restored."
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors font-aileron"
          >
            Close
          </button>
        </div>
      }
    >
      {isLoading ? (
        <LoadingState message="Loading versions…" variant="spinner" />
      ) : loadError ? (
        <ErrorState
          message={loadError}
          onRetry={() => {
            if (!article) return;
            setIsLoading(true);
            setLoadError(null);
            void listFaqArticleRevisions(article.id)
              .then((rows) => {
                setRevisions(rows);
                setSelectedId(rows[1]?.id ?? rows[0]?.id ?? null);
              })
              .catch((error) => {
                console.error("Failed to load FAQ versions:", error);
                setLoadError("Couldn't load earlier versions. Please try again.");
              })
              .finally(() => setIsLoading(false));
          }}
        />
      ) : !selected || !current ? (
        <p className="text-sm text-slate-500 font-aileron">
          No earlier versions yet.
        </p>
      ) : (
        <div className="space-y-5">
          {renderSectionLabel(<Clock className="w-3.5 h-3.5" />, "Version")}
          <ul className="space-y-1.5">
            {revisions.map((row) => {
              const active = row.id === selected.id;
              const isLatest = row.id === current.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedId(row.id);
                      setView("diff");
                    }}
                    className={`w-full text-left rounded-xl border px-3 py-2 text-[11px] font-semibold leading-snug font-aileron transition-colors ${
                      active
                        ? "border-[#4ec2bb] bg-[#4ec2bb]/10 text-slate-800"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                    }`}
                  >
                    {formatFaqRevisionLabel(
                      row.version,
                      row.created_at,
                      row.edited_by_name,
                      isLatest,
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              aria-pressed={view === "diff"}
              onClick={() => setView("diff")}
              className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider font-quicksand ${
                view === "diff"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <History className="w-3 h-3" /> What changed
            </button>
            <button
              type="button"
              aria-pressed={view === "read"}
              onClick={() => setView("read")}
              className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider font-quicksand ${
                view === "read"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-3 h-3" /> Read that version
            </button>
          </div>

          {view === "read" ? (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                {selected.title}
              </h2>
              <CategoryChips
                categories={selected.tags}
                labels={FAQ_TAG_LABELS}
                styles={FAQ_TAG_STYLES}
                maxVisible={12}
              />
              <MarkdownBody source={selected.body} />
            </div>
          ) : isCurrent ? (
            <p className="text-sm text-slate-500 font-aileron">
              This is the current answer. Pick an earlier version to see what
              changed.
            </p>
          ) : !hasAnyChanges ? (
            <p className="text-sm text-slate-500 font-aileron">
              No differences from the current answer.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-400 font-aileron">
                Highlights show what the current answer added or removed compared
                with this version.
              </p>
              {renderSectionLabel(<Type className="w-3.5 h-3.5" />, "Question")}
              {hasTitleChanges ? (
                <TitleDiff tokens={titleTokens} />
              ) : (
                <p className="text-sm font-bold text-slate-900">{current.title}</p>
              )}
              {renderSectionLabel(<Tags className="w-3.5 h-3.5" />, "Tags")}
              <TagDiff previous={selected.tags} current={current.tags} />
              {renderSectionLabel(<FileText className="w-3.5 h-3.5" />, "Answer")}
              {hasBodyChanges ? (
                <BodyDiff tokens={bodyTokens} />
              ) : (
                <MarkdownBody source={current.body} />
              )}
            </div>
          )}
        </div>
      )}
    </SlideOverModal>
  );
}
