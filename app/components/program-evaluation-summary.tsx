"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, BarChart3, MessageSquareText, Trash2 } from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import { EmptyState } from "@/app/components/state-views";
import { useToast } from "@/app/components/toast";
import {
  EVALUATION_FORM_TITLE,
  EVALUATION_RATING_SCALE,
} from "@/lib/evaluation-form";
import { ensureProgramEvaluation } from "@/lib/program-evaluation";
import {
  formatEvaluationAverage,
  summarizeEvaluationResponses,
  type EvaluationComment,
  type EvaluationSummary,
  type RatingGroupSummary,
} from "@/lib/evaluation-summary";
import type { ProgramType } from "@/lib/routes";
import { programRoutes } from "@/lib/routes";
import { getRowsFromDB, getUsersFromDB, deleteDataFromDB } from "@/lib/supabase";
import type { AssessmentResponse, User } from "@/types/database";

type ProgramEvaluationSummaryProps = {
  programId: string;
  programType: ProgramType;
};

function submittedDate(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function RatingBar({ average }: { average: number | null }) {
  const width = average == null ? 0 : Math.min(100, (average / 5) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
      <div
        className="h-full rounded-full bg-[#2a7797]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function RatingGroups({ groups }: { groups: RatingGroupSummary[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.id}
          className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3"
        >
          <h3 className="text-xs font-extrabold text-slate-700">
            {group.question}
          </h3>
          <div className="space-y-3">
            {group.statements.map((statement) => (
              <div
                key={statement.id}
                className="bg-white/80 border border-slate-200/80 p-3 rounded-xl space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-700 leading-snug">
                    {statement.statement}
                  </p>
                  <p className="text-sm font-extrabold text-[#2a7797] tabular-nums shrink-0">
                    {formatEvaluationAverage(statement.average)}
                  </p>
                </div>
                <RatingBar average={statement.average} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {statement.ratingCount} rating
                  {statement.ratingCount === 1 ? "" : "s"}
                  {statement.naCount > 0
                    ? ` · ${statement.naCount} N/A`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CommentList({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: EvaluationComment[];
  emptyLabel: string;
}) {
  return (
    <section className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3">
      <h3 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
        <MessageSquareText className="w-3.5 h-3.5 text-[#2a7797]" />
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, index) => (
            <li
              key={`${entry.participantName}-${entry.submittedAt}-${index}`}
              className="bg-white/80 border border-slate-200/80 p-3 rounded-xl space-y-1.5"
            >
              <p className="text-[11px] font-bold text-slate-500">
                {entry.participantName}
                {entry.submittedAt ? (
                  <span className="text-slate-400 font-semibold">
                    {" "}
                    · {submittedDate(entry.submittedAt)}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {entry.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ProgramEvaluationSummary({
  programId,
  programType,
}: ProgramEvaluationSummaryProps) {
  const { showToast } = useToast();
  const routes = programRoutes(programType);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<EvaluationSummary>(() =>
    summarizeEvaluationResponses([]),
  );
  const [responseIds, setResponseIds] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const evaluationId = await ensureProgramEvaluation(programId);
      const [responses, users] = await Promise.all([
        getRowsFromDB<AssessmentResponse>("assessment_response"),
        getUsersFromDB<Pick<User, "id" | "name">>(["trainee", "intern"]),
      ]);

      const programResponses = evaluationId
        ? responses.filter((row) => row.assessment_id === evaluationId)
        : [];
      const nameByUserId: Record<string, string> = {};
      for (const user of users) {
        nameByUserId[user.id] = user.name;
      }
      setResponseIds(programResponses.map((row) => row.id));
      setSummary(summarizeEvaluationResponses(programResponses, nameByUserId));
    } catch (error) {
      console.error("Error loading evaluation summary:", error);
      showToast("Failed to load evaluation responses.", "error");
      setResponseIds([]);
      setSummary(summarizeEvaluationResponses([]));
    } finally {
      setIsLoading(false);
    }
  }, [programId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClearResponses = async () => {
    setIsClearing(true);
    try {
      for (const id of responseIds) {
        await deleteDataFromDB("assessment_response", id);
      }
      showToast("Evaluation responses cleared.", "success");
      setConfirmClear(false);
      await load();
    } catch (error) {
      console.error("Error clearing evaluation responses:", error);
      showToast("Failed to clear evaluation responses.", "error");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2a7797]/10 text-[#2a7797]">
          1. Evaluation Summary
        </span>
        <Link
          href={routes.certificate(programId)}
          className="px-4 py-2 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          2. Certificate Registry{" "}
          <Award className="w-3.5 h-3.5 text-[#f57f17]" />
        </Link>
      </div>

      <div className="space-y-6 w-full bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        <div className="border-b border-slate-200/60 pb-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2a7797]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                {EVALUATION_FORM_TITLE}
              </h2>
            </div>
            {!isLoading && summary.responseCount > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-rose-200 bg-white text-rose-600 text-[11px] font-bold hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear responses
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            Average ratings exclude N/A. Written comments and suggestions are
            listed as submitted.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
          </div>
        ) : summary.responseCount === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No evaluations yet"
            description="Responses will show here after participants submit the post-activity form."
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#f2f2f2] border border-slate-300/40 rounded-[20px] p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Responses
                </p>
                <p className="text-2xl font-extrabold text-slate-800 tabular-nums mt-1">
                  {summary.responseCount}
                </p>
              </div>
              <div className="bg-[#f2f2f2] border border-slate-300/40 rounded-[20px] p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Overall average
                </p>
                <p className="text-2xl font-extrabold text-[#2a7797] tabular-nums mt-1">
                  {formatEvaluationAverage(summary.overallAverage)}
                  <span className="text-xs font-bold text-slate-400"> / 5</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {EVALUATION_RATING_SCALE.map((option) => (
                <span
                  key={String(option.value)}
                  className="inline-flex items-baseline gap-1 shrink-0 tabular-nums"
                >
                  <span>{option.value}</span>
                  <span>— {option.label}</span>
                </span>
              ))}
            </div>

            <RatingGroups groups={summary.ratingGroups} />

            <section className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3">
              <h3 className="text-xs font-extrabold text-slate-700">
                Why did you attend this activity?
              </h3>
              <ul className="space-y-2">
                {summary.attendanceReasons.map((row) => (
                  <li
                    key={row.option}
                    className="flex items-center justify-between gap-3 bg-white/80 border border-slate-200/80 px-3 py-2 rounded-xl"
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {row.option}
                    </span>
                    <span className="text-xs font-extrabold text-[#2a7797] tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <CommentList
              title="Suggestions for future activities"
              entries={summary.suggestions}
              emptyLabel="No suggestions were written."
            />
            <CommentList
              title="Overall comments"
              entries={summary.comments}
              emptyLabel="No overall comments were written."
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmClear}
        title="Clear evaluation responses"
        message={
          <>
            Remove all {summary.responseCount} submitted evaluation
            {summary.responseCount === 1 ? "" : "s"} for this program? This
            cannot be undone. Certificates are not deleted — remove a test
            certificate from the Certificate tab if needed.
          </>
        }
        confirmLabel="Clear responses"
        isConfirming={isClearing}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClearResponses}
      />
    </div>
  );
}
