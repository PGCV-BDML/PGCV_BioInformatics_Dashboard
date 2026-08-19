"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, MessageSquareText, Trash2 } from "lucide-react";
import ConfirmModal from "@/app/components/confirm-modal";
import { EmptyState } from "@/app/components/state-views";
import { useToast } from "@/app/components/toast";
import {
  formatAssessmentAverage,
  summarizeProgramAssessments,
  type ProgramAssessmentSummaryData,
  type TestSummary,
} from "@/lib/assessment-summary";
import { describeDeleteError } from "@/lib/db-errors";
import type { ProgramType } from "@/lib/routes";
import { getRowsFromDB, getUsersFromDB, supabase } from "@/lib/supabase";
import type { Assessment, AssessmentResponse, Question, User } from "@/types/database";

type ProgramAssessmentSummaryProps = {
  programId: string;
  programType: ProgramType;
};

function ScoreCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="bg-[#f2f2f2] border border-slate-300/40 rounded-[20px] p-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-extrabold text-slate-800 tabular-nums mt-1">
        {value}
        {suffix ? (
          <span className="text-xs font-bold text-slate-400">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

function TestSection({
  title,
  summary,
}: {
  title: string;
  summary: TestSummary;
}) {
  return (
    <section className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-extrabold text-slate-700">{title}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {summary.questionCount} question{summary.questionCount === 1 ? "" : "s"}
        </p>
      </div>
      {summary.questionCount === 0 ? (
        <p className="text-xs text-slate-400">No {title.toLowerCase()} is configured.</p>
      ) : summary.responseCount === 0 ? (
        <p className="text-xs text-slate-400">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {summary.mcqItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/80 border border-slate-200/80 p-3 rounded-xl space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700 leading-snug">
                  {item.question}
                </p>
                <p className="text-sm font-extrabold text-[#2a7797] tabular-nums shrink-0">
                  {item.correctPercent == null ? "—" : `${item.correctPercent}%`}
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2a7797]"
                  style={{ width: `${item.correctPercent ?? 0}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {item.answeredCount} answered
              </p>
            </div>
          ))}
          {summary.textAnswers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-[#2a7797]" />
                Written answers
              </h4>
              <ul className="space-y-2">
                {summary.textAnswers.map((entry, index) => (
                  <li
                    key={`${entry.participantName}-${entry.submittedAt}-${index}`}
                    className="bg-white/80 border border-slate-200/80 p-3 rounded-xl space-y-1.5"
                  >
                    <p className="text-[11px] font-bold text-slate-500">
                      {entry.participantName}
                      {entry.submittedAt ? (
                        <span className="text-slate-400 font-semibold">
                          {" "}
                          · {entry.submittedAt.slice(0, 10)}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {entry.question}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {entry.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function ProgramAssessmentSummary({
  programId,
}: ProgramAssessmentSummaryProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<ProgramAssessmentSummaryData>(() =>
    summarizeProgramAssessments({
      preId: null,
      postId: null,
      preQuestions: [],
      postQuestions: [],
      responses: [],
    }),
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assessments, responses, users] = await Promise.all([
        getRowsFromDB<Assessment>("assessment"),
        getRowsFromDB<AssessmentResponse>("assessment_response"),
        getUsersFromDB<Pick<User, "id" | "name">>(["trainee", "intern"]),
      ]);
      const programAssessments = assessments.filter(
        (row) => row.program_id === programId,
      );
      const pre = programAssessments.find((row) => row.type === "pre_test");
      const post = programAssessments.find((row) => row.type === "post_test");
      const nameByUserId: Record<string, string> = {};
      for (const user of users) {
        nameByUserId[user.id] = user.name;
      }
      setSummary(
        summarizeProgramAssessments({
          preId: pre?.id ?? null,
          postId: post?.id ?? null,
          preQuestions: (pre?.questions ?? []) as Question[],
          postQuestions: (post?.questions ?? []) as Question[],
          responses,
          nameByUserId,
        }),
      );
    } catch (error) {
      console.error("Error loading assessment summary:", error);
      showToast("Failed to load test responses.", "error");
      setSummary(
        summarizeProgramAssessments({
          preId: null,
          postId: null,
          preQuestions: [],
          postQuestions: [],
          responses: [],
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [programId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const responseIds = [...summary.pre.responseIds, ...summary.post.responseIds];
  const responseCount = summary.pre.responseCount + summary.post.responseCount;

  const handleClearResponses = async () => {
    if (responseIds.length === 0) return;
    setIsClearing(true);
    try {
      const { data: deleted, error: deleteError } = await supabase
        .from("assessment_response")
        .delete()
        .in("id", responseIds)
        .select("id");
      if (deleteError) throw deleteError;

      const deletedIds = new Set((deleted ?? []).map((row) => row.id));
      const remaining = responseIds.filter((id) => !deletedIds.has(id));
      if (remaining.length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from("assessment_response")
          .update({ answers: {}, score: null })
          .in("id", remaining)
          .select("id");
        if (updateError) throw updateError;
        if (!updated?.length) {
          throw new Error("No test responses were cleared.");
        }
      }

      showToast("Test responses cleared.", "success");
      setConfirmClear(false);
      await load();
    } catch (error) {
      console.error("Error clearing test responses:", error);
      showToast(describeDeleteError(error, "assessment_response"), "error");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 w-full bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
      <div className="border-b border-slate-200/60 pb-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#2a7797]" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Pre / Post Test Summary
            </h2>
          </div>
          {!isLoading && responseCount > 0 && (
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
          Multiple-choice items are scored as a percent correct. Written answers
          are listed as submitted.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
        </div>
      ) : responseCount === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No test responses yet"
          description="Scores will show here after participants submit a pre-test or post-test."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <ScoreCard
              label="Pre-test responses"
              value={String(summary.pre.responseCount)}
            />
            <ScoreCard
              label="Pre-test average"
              value={formatAssessmentAverage(summary.pre.averageScore)}
              suffix=" %"
            />
            <ScoreCard
              label="Post-test responses"
              value={String(summary.post.responseCount)}
            />
            <ScoreCard
              label="Average gain"
              value={formatAssessmentAverage(summary.averageGain)}
              suffix=" pts"
            />
          </div>

          {summary.participants.length > 0 && (
            <section className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3">
              <h3 className="text-xs font-extrabold text-slate-700">
                Participant scores
              </h3>
              <div className="overflow-x-auto bg-white/80 border border-slate-200/80 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="px-3 py-2 font-extrabold">Name</th>
                      <th className="px-3 py-2 font-extrabold">Pre</th>
                      <th className="px-3 py-2 font-extrabold">Post</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.participants.map((row) => (
                      <tr
                        key={row.participantId}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          {row.name}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-bold text-[#2a7797]">
                          {row.preScore == null ? "—" : `${row.preScore}%`}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-bold text-[#2a7797]">
                          {row.postScore == null ? "—" : `${row.postScore}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <TestSection title="Pre-Test" summary={summary.pre} />
          <TestSection title="Post-Test" summary={summary.post} />
        </div>
      )}

      <ConfirmModal
        isOpen={confirmClear}
        title="Clear test responses"
        message={
          <>
            Remove all {responseCount} submitted pre/post test
            {responseCount === 1 ? "" : "s"} for this program? This cannot be
            undone.
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
