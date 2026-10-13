"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GitCompareArrows,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { usePortal } from "@/app/components/portal-context";
import { ScoreCard } from "@/app/components/program-assessment-summary";
import { EmptyState, ErrorState } from "@/app/components/state-views";
import {
  buildParticipantAnswers,
  type AnswerComparisonRow,
  type AnswerSheet,
  type AnswerSheetItem,
} from "@/lib/assessment-answers";
import {
  formatAssessmentAverage,
  summarizeProgramAssessments,
  type AssessmentResponseRow,
} from "@/lib/assessment-summary";
import { programRoutes, type ProgramType } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { loadUserNameMap } from "@/lib/user-names";
import type { Assessment, Question } from "@/types/database";

type ParticipantAssessmentAnswersProps = {
  programId: string;
  programType: ProgramType;
  participantId: string;
};

type LoadedTests = {
  pre: Pick<Assessment, "id" | "questions"> | null;
  post: Pick<Assessment, "id" | "questions"> | null;
  responses: AssessmentResponseRow[];
  nameByUserId: Record<string, string>;
};

function submittedDate(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function StatusIcon({ item }: { item: AnswerSheetItem }) {
  if (item.status === "correct") {
    return (
      <CheckCircle2
        className="w-4 h-4 text-[#359b95] shrink-0"
        aria-label="Correct"
      />
    );
  }
  if (item.status === "incorrect") {
    return (
      <XCircle className="w-4 h-4 text-rose-500 shrink-0" aria-label="Incorrect" />
    );
  }
  if (item.status === "blank") {
    return (
      <MinusCircle
        className="w-4 h-4 text-slate-300 shrink-0"
        aria-label="No answer"
      />
    );
  }
  return null;
}

function AnswerText({ item }: { item: AnswerSheetItem }) {
  if (item.answer == null) {
    return <span className="font-semibold text-amber-600">No answer</span>;
  }
  return <span>{item.answer}</span>;
}

function SheetSection({ title, sheet }: { title: string; sheet: AnswerSheet }) {
  const mcqItems = sheet.items.filter((item) => item.type === "mcq");
  const correct = mcqItems.filter((item) => item.status === "correct").length;
  return (
    <section className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-4 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-extrabold text-slate-700">{title}</h3>
        {sheet.submitted ? (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">
            Submitted {submittedDate(sheet.submittedAt)}
            {mcqItems.length > 0 ? ` · ${correct}/${mcqItems.length} correct` : ""}
          </p>
        ) : null}
      </div>
      {sheet.items.length === 0 ? (
        <p className="text-xs text-slate-400">
          No {title.toLowerCase()} is configured.
        </p>
      ) : !sheet.submitted ? (
        <p className="text-xs text-slate-400">Not submitted yet.</p>
      ) : (
        <div className="space-y-2">
          {sheet.items.map((item, index) => {
            const startsSection =
              item.section && item.section !== sheet.items[index - 1]?.section;
            return (
              <Fragment key={item.id}>
                {startsSection ? (
                  <h4 className="pt-2 text-[11px] font-extrabold text-[#2a7797] uppercase tracking-[1.5px]">
                    {item.section}
                  </h4>
                ) : null}
                <div className="bg-white/80 border border-slate-200/80 p-3 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 leading-snug">
                    {item.number}. {item.question}
                  </p>
                  <div className="flex items-start gap-2 pl-4 text-xs text-slate-600 leading-relaxed">
                    <StatusIcon item={item} />
                    <p className="min-w-0 whitespace-pre-wrap break-words">
                      <AnswerText item={item} />
                    </p>
                  </div>
                  {item.status !== "correct" && item.correctAnswer ? (
                    <p className="pl-10 text-[11px] font-semibold text-slate-400">
                      Correct answer: {item.correctAnswer}
                    </p>
                  ) : null}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ComparisonCell({ item }: { item: AnswerSheetItem }) {
  return (
    <div className="flex items-start gap-1.5">
      <StatusIcon item={item} />
      <span className="min-w-0 break-words">
        <AnswerText item={item} />
      </span>
    </div>
  );
}

function ratingChange(row: AnswerComparisonRow): string | null {
  if (row.pre.rating == null || row.post.rating == null) return null;
  const change = row.post.rating - row.pre.rating;
  return change > 0 ? `+${change}` : String(change);
}

function ComparisonSection({ rows }: { rows: AnswerComparisonRow[] }) {
  const mcqRows = rows.filter((row) => row.type === "mcq");
  const preCorrect = mcqRows.filter((row) => row.pre.status === "correct").length;
  const postCorrect = mcqRows.filter(
    (row) => row.post.status === "correct",
  ).length;
  return (
    <section className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <GitCompareArrows className="w-4 h-4 text-[#2a7797]" />
          Pre vs Post
        </h3>
        {mcqRows.length > 0 ? (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Knowledge check: {preCorrect}/{mcqRows.length} before →{" "}
            {postCorrect}/{mcqRows.length} after
          </p>
        ) : null}
      </div>
      <p className="text-[11px] text-slate-500">
        Questions asked in both tests, side by side.
      </p>
      <div className="overflow-x-auto bg-white/80 border border-slate-200/80 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="px-3 py-2 font-extrabold">Question</th>
              <th className="px-3 py-2 font-extrabold">Pre</th>
              <th className="px-3 py-2 font-extrabold">Post</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const change = row.type === "rating" ? ratingChange(row) : null;
              return (
                <tr
                  key={row.post.id}
                  className="border-b border-slate-100 last:border-0 align-top"
                >
                  <td className="px-3 py-2 font-semibold text-slate-700 min-w-[220px]">
                    {row.question}
                  </td>
                  <td className="px-3 py-2 text-slate-600 min-w-[160px]">
                    <ComparisonCell item={row.pre} />
                  </td>
                  <td className="px-3 py-2 text-slate-600 min-w-[160px]">
                    <ComparisonCell item={row.post} />
                    {change ? (
                      <span
                        className={`mt-1 inline-block text-[10px] font-extrabold tabular-nums ${
                          change.startsWith("+")
                            ? "text-[#359b95]"
                            : change === "0"
                              ? "text-slate-400"
                              : "text-rose-500"
                        }`}
                      >
                        {change === "0" ? "No change" : `${change} pts`}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ParticipantAssessmentAnswers({
  programId,
  programType,
  participantId,
}: ParticipantAssessmentAnswersProps) {
  const router = useRouter();
  const { isStaff, isLearnerView, loading } = usePortal();
  const paths = programRoutes(programType);
  const canView = !loading && isStaff && !isLearnerView;
  const learnerLabel = programType === "training" ? "trainee" : "intern";

  const [tests, setTests] = useState<LoadedTests | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !canView) {
      router.replace(paths.assessment(programId));
    }
  }, [canView, loading, paths, programId, router]);

  const load = useCallback(async () => {
    try {
      const { data: assessments, error: assessmentError } = await supabase
        .from("assessment")
        .select("id, type, questions")
        .eq("program_id", programId)
        .in("type", ["pre_test", "post_test"]);
      if (assessmentError) throw assessmentError;
      const rows = (assessments ?? []) as Pick<
        Assessment,
        "id" | "type" | "questions"
      >[];
      const pre = rows.find((row) => row.type === "pre_test") ?? null;
      const post = rows.find((row) => row.type === "post_test") ?? null;

      const testIds = [pre?.id, post?.id].filter(
        (id): id is string => Boolean(id),
      );
      let responses: AssessmentResponseRow[] = [];
      if (testIds.length > 0) {
        const { data, error } = await supabase
          .from("assessment_response")
          .select("id, assessment_id, participant_id, answers, score, submitted_at")
          .in("assessment_id", testIds);
        if (error) throw error;
        responses = (data ?? []) as AssessmentResponseRow[];
      }

      const nameMap = await loadUserNameMap(
        responses.map((row) => row.participant_id),
      );
      setTests({
        pre,
        post,
        responses,
        nameByUserId: Object.fromEntries(nameMap),
      });
      setLoadError(null);
    } catch (error) {
      console.error("Error loading test answers:", error);
      setLoadError("Failed to load test answers.");
    }
  }, [programId]);

  useEffect(() => {
    if (!canView) return;
    const run = async () => {
      await load();
    };
    void run();
  }, [canView, load]);

  const view = useMemo(() => {
    if (!tests) return null;
    const preQuestions = (tests.pre?.questions ?? []) as Question[];
    const postQuestions = (tests.post?.questions ?? []) as Question[];
    const { participants } = summarizeProgramAssessments({
      preId: tests.pre?.id ?? null,
      postId: tests.post?.id ?? null,
      preQuestions,
      postQuestions,
      responses: tests.responses,
      nameByUserId: tests.nameByUserId,
    });
    const index = participants.findIndex(
      (row) => row.participantId === participantId,
    );
    return {
      participants,
      index,
      current: index === -1 ? null : participants[index]!,
      answers: buildParticipantAnswers({
        participantId,
        preId: tests.pre?.id ?? null,
        postId: tests.post?.id ?? null,
        preQuestions,
        postQuestions,
        responses: tests.responses,
      }),
    };
  }, [tests, participantId]);

  const backLink = (
    <Link
      href={paths.assessment(programId)}
      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
    >
      <ArrowLeft className="w-4 h-4" /> Back to summary
    </Link>
  );

  if (!canView || (!tests && !loadError)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <div className="space-y-4 w-full bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        {backLink}
        <ErrorState
          message={loadError ?? "Failed to load test answers."}
          onRetry={() => {
            setLoadError(null);
            void load();
          }}
        />
      </div>
    );
  }

  const { participants, index, current, answers } = view;
  const previous = index > 0 ? participants[index - 1] : undefined;
  const next =
    index !== -1 && index < participants.length - 1
      ? participants[index + 1]
      : undefined;
  const gain =
    current?.preScore != null && current.postScore != null
      ? current.postScore - current.preScore
      : null;
  const navButtonClass =
    "inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors";
  const navButtonDisabledClass =
    "inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-100 bg-white text-slate-300";

  return (
    <div className="space-y-6 w-full bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
        {backLink}
        {participants.length > 0 ? (
          <div className="flex items-center gap-2">
            {previous ? (
              <Link
                href={paths.assessmentParticipant(programId, previous.participantId)}
                className={navButtonClass}
                aria-label={`Previous ${learnerLabel}: ${previous.name}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            ) : (
              <span className={navButtonDisabledClass} aria-hidden="true">
                <ChevronLeft className="w-4 h-4" />
              </span>
            )}
            <select
              aria-label={`Choose a ${learnerLabel}`}
              value={current ? participantId : ""}
              onChange={(event) =>
                router.push(
                  paths.assessmentParticipant(programId, event.target.value),
                )
              }
              className="h-9 max-w-[220px] text-xs font-semibold rounded-xl border-slate-200 bg-white text-slate-700 focus:border-[#4ec2bb] focus:ring-[#4ec2bb]"
            >
              {!current ? (
                <option value="" disabled>
                  Choose a {learnerLabel}
                </option>
              ) : null}
              {participants.map((row) => (
                <option key={row.participantId} value={row.participantId}>
                  {row.name}
                </option>
              ))}
            </select>
            {next ? (
              <Link
                href={paths.assessmentParticipant(programId, next.participantId)}
                className={navButtonClass}
                aria-label={`Next ${learnerLabel}: ${next.name}`}
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className={navButtonDisabledClass} aria-hidden="true">
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        ) : null}
      </div>

      {!current ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No test answers found"
          description={`This ${learnerLabel} hasn't submitted a pre-test or post-test for this program, or their responses were cleared.`}
        />
      ) : (
        <>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#2a7797]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                {current.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Pre / post test answers ·{" "}
              {programType === "training" ? "Trainee" : "Intern"} {index + 1} of{" "}
              {participants.length}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ScoreCard
              label="Pre-test score"
              value={current.preScore == null ? "—" : String(current.preScore)}
              suffix={current.preScore == null ? undefined : " %"}
              hint={
                answers.pre.submitted
                  ? `Submitted ${submittedDate(answers.pre.submittedAt)}`
                  : "Not submitted"
              }
            />
            <ScoreCard
              label="Post-test score"
              value={current.postScore == null ? "—" : String(current.postScore)}
              suffix={current.postScore == null ? undefined : " %"}
              hint={
                answers.post.submitted
                  ? `Submitted ${submittedDate(answers.post.submittedAt)}`
                  : "Not submitted"
              }
            />
            <ScoreCard
              label="Gain"
              value={
                gain == null
                  ? "—"
                  : `${gain > 0 ? "+" : ""}${formatAssessmentAverage(gain)}`
              }
              suffix={gain == null ? undefined : " pts"}
            />
          </div>

          {answers.pre.submitted &&
          answers.post.submitted &&
          answers.comparison.length > 0 ? (
            <ComparisonSection rows={answers.comparison} />
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <SheetSection title="Pre-Test" sheet={answers.pre} />
            <SheetSection title="Post-Test" sheet={answers.post} />
          </div>
        </>
      )}
    </div>
  );
}
