"use client";

import { CheckCircle2, Circle, ClipboardCheck, ListChecks, MinusCircle, X, XCircle } from "lucide-react";
import {
  PLATFORM_LABELS,
  chosenAnswer,
  quizIsSubmitted,
  quizItemStatus,
  quizSubmittedAt,
  type ChecklistKind,
  type ProgressSummary,
  type QuizItemStatus,
} from "@/lib/module-progress";

interface ModuleProgressModalProps {
  isOpen: boolean;
  participantName: string;
  moduleTitle: string;
  summary: ProgressSummary | null;
  /** `quiz` is a pre-test or post-test. Setup modules stay on the step checklist. */
  kind?: ChecklistKind;
  onClose: () => void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const QUIZ_STATUS_LABEL: Record<QuizItemStatus, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  unanswered: "No answer",
};

function QuizStatusIcon({ status }: { status: QuizItemStatus }) {
  if (status === "correct") {
    return (
      <CheckCircle2 className="w-4 h-4 text-[#359b95] shrink-0" aria-label="Correct" />
    );
  }
  if (status === "incorrect") {
    return (
      <XCircle className="w-4 h-4 text-rose-500 shrink-0" aria-label="Incorrect" />
    );
  }
  return (
    <MinusCircle className="w-4 h-4 text-slate-300 shrink-0" aria-label="No answer" />
  );
}

/** One learner's checklist for a library module, or their score on a test. */
export default function ModuleProgressModal({
  isOpen,
  participantName,
  moduleTitle,
  summary,
  kind = "steps",
  onClose,
}: ModuleProgressModalProps) {
  if (!isOpen || !summary) return null;

  const isQuiz = kind === "quiz";
  const platform = summary.items.find((item) => item.platform)?.platform ?? null;
  const submitted = isQuiz && quizIsSubmitted(summary.items);
  const submittedAt = submitted ? formatWhen(quizSubmittedAt(summary.items)) : "";

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-progress-title"
        className={`bg-surface rounded-[24px] w-full max-h-[85vh] flex flex-col shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 ${
          isQuiz ? "max-w-[720px]" : "max-w-[640px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 text-[#2a7797]">
            {isQuiz ? (
              <ClipboardCheck className="w-5 h-5 shrink-0" />
            ) : (
              <ListChecks className="w-5 h-5 shrink-0" />
            )}
            <div>
              <h4 id="module-progress-title" className="text-lg font-bold text-slate-800">
                {participantName}
              </h4>
              <p className="text-xs font-semibold text-slate-500">
                {moduleTitle}
                {isQuiz
                  ? submitted
                    ? ` · ${summary.done} of ${summary.total} correct${submittedAt ? ` · Submitted ${submittedAt}` : ""}`
                    : " · Not submitted"
                  : ` · ${summary.done} of ${summary.total} done${platform ? ` · ${PLATFORM_LABELS[platform]}` : ""}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isQuiz ? (
          submitted ? (
            <ol className="overflow-y-auto p-6 pt-3 space-y-2">
              {summary.items.map((item) => {
                const status = quizItemStatus(item);
                const answer = chosenAnswer(item.evidence);
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {item.label}
                    </p>
                    <div className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                      <QuizStatusIcon status={status} />
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                        {answer ?? (
                          <span className="font-semibold text-amber-600">No answer</span>
                        )}
                      </p>
                      <span
                        className={`ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide ${
                          status === "correct"
                            ? "text-[#359b95]"
                            : status === "incorrect"
                              ? "text-rose-500"
                              : "text-slate-400"
                        }`}
                      >
                        {QUIZ_STATUS_LABEL[status]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="p-6 text-sm text-slate-500">
              This test has not been submitted yet. Answers appear here after the trainee submits from the module.
            </p>
          )
        ) : (
          <ol className="overflow-y-auto p-6 pt-3 space-y-1">
            {summary.items.map((item, index) => (
              <li key={item.id} className="py-2 border-b border-slate-100 last:border-b-0">
                <div className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 shrink-0 text-slate-300" />
                  )}
                  <span className={`text-sm font-semibold ${item.done ? "text-slate-800" : "text-slate-500"}`}>
                    {index + 1}. {item.label}
                  </span>
                  <span className="ml-auto text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {item.done ? formatWhen(item.completed_at) : item.evidence ? "In progress" : "Not started"}
                  </span>
                </div>
                {item.evidence && (
                  <details className="mt-1 ml-6">
                    <summary className="cursor-pointer text-[11px] font-bold text-[#2a7797]">
                      Pasted output
                    </summary>
                    <pre className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {item.evidence}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
