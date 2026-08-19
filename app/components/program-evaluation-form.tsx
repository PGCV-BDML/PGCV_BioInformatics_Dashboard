"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BarChart3,
  CheckCircle,
  Send,
} from "lucide-react";
import { DataPrivacyNotice } from "@/app/components/data-privacy-notice";
import { usePortal } from "@/app/components/portal-context";
import ProgramEvaluationSummary from "@/app/components/program-evaluation-summary";
import { useToast } from "@/app/components/toast";
import {
  EVALUATION_DATA_PRIVACY,
  EVALUATION_FORM_INTRO,
  EVALUATION_FORM_TITLE,
  EVALUATION_RATING_SCALE,
  missingRequiredAnswers,
  POST_ACTIVITY_EVALUATION_QUESTIONS,
  prefillEvaluationAnswers,
  type EvaluationAnswers,
  type EvaluationAnswerValue,
  type PostActivityQuestion,
} from "@/lib/evaluation-form";
import { ensureProgramEvaluation } from "@/lib/program-evaluation";
import type { ProgramType } from "@/lib/routes";
import { programRoutes } from "@/lib/routes";
import {
  getCurrentUser,
  getRowsFromDB,
  saveDataToDB,
  supabase,
} from "@/lib/supabase";
import type {
  Certificate,
  EvaluationRatingValue,
  TrainingProgram,
  User,
} from "@/types/database";

const INPUT_CLASS =
  "w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 transition-all";

const TEXTAREA_CLASS =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 transition-all resize-none";

type ProgramEvaluationFormProps = {
  programId: string;
  programType: ProgramType;
};

function isRequired(question: PostActivityQuestion): boolean {
  return question.required !== false;
}

function RequiredMark({ required }: { required: boolean }) {
  if (!required) return null;
  return (
    <span className="text-rose-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function QuestionLabel({
  htmlFor,
  number,
  question,
  required,
}: {
  htmlFor?: string;
  number: number;
  question: string;
  required: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-extrabold text-slate-700 block leading-snug"
    >
      {number}. {question}
      <RequiredMark required={required} />
    </label>
  );
}

function LikertScale({
  name,
  value,
  allowNA,
  onChange,
}: {
  name: string;
  value: EvaluationAnswerValue | undefined;
  allowNA: boolean;
  onChange: (next: EvaluationRatingValue) => void;
}) {
  const options = allowNA
    ? EVALUATION_RATING_SCALE
    : EVALUATION_RATING_SCALE.filter((option) => option.value !== "N/A");

  return (
    <div
      className="grid w-full gap-1.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={name}
    >
      {options.map((option) => {
        const selected = String(value) === String(option.value);
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${option.value} — ${option.label}`}
            onClick={() => onChange(option.value)}
            className={`h-9 w-full min-w-0 px-1 rounded-lg border text-[11px] font-extrabold leading-none tabular-nums flex items-center justify-center whitespace-nowrap overflow-hidden transition-all ${
              selected
                ? "bg-[#2a7797] border-[#2a7797] text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-500 hover:border-[#4ec2bb] hover:text-[#2a7797]"
            }`}
          >
            {option.value}
          </button>
        );
      })}
    </div>
  );
}

export default function ProgramEvaluationForm({
  programId,
  programType,
}: ProgramEvaluationFormProps) {
  const { isStaff, isLearnerView, loading } = usePortal();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isStaff && !isLearnerView) {
    return (
      <ProgramEvaluationSummary
        programId={programId}
        programType={programType}
      />
    );
  }

  return (
    <LearnerEvaluationForm programId={programId} programType={programType} />
  );
}

function LearnerEvaluationForm({
  programId,
  programType,
}: ProgramEvaluationFormProps) {
  const { showToast } = useToast();
  const routes = programRoutes(programType);
  const questions = POST_ACTIVITY_EVALUATION_QUESTIONS;

  const [answers, setAnswers] = useState<EvaluationAnswers>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missingIds, setMissingIds] = useState<string[]>([]);

  const isTraining = programType === "training";
  const submitLabel = isTraining
    ? "Submit Evaluation & Generate Award Certificate"
    : "Submit Evaluation & Generate Internship Certificate";

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [programs, authUser, evaluationId] = await Promise.all([
          getRowsFromDB<TrainingProgram>("training_program"),
          getCurrentUser(),
          ensureProgramEvaluation(programId),
        ]);

        setAssessmentId(evaluationId);

        const program = programs.find((row) => row.id === programId);
        let profile: Pick<
          User,
          "name" | "email" | "institution" | "designation"
        > | null = null;

        if (authUser) {
          const { data } = await supabase
            .from("users")
            .select("name, email, institution, designation")
            .eq("id", authUser.id)
            .maybeSingle();
          profile = data;
        }

        setAnswers(
          prefillEvaluationAnswers({
            name:
              profile?.name ||
              (authUser?.user_metadata?.full_name as string | undefined) ||
              (authUser?.user_metadata?.name as string | undefined),
            email: profile?.email || authUser?.email,
            activityTitle: program?.title,
            startDate: program?.start_date,
            endDate: program?.end_date,
            institution:
              profile?.institution || program?.requesting_institution,
            designation: profile?.designation,
          }),
        );
      } catch (error) {
        console.error("Error loading evaluation form:", error);
        showToast("Failed to load the evaluation form.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [programId, showToast]);

  const setAnswer = (id: string, value: EvaluationAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setMissingIds((prev) => prev.filter((missingId) => missingId !== id));
  };

  const setGroupAnswer = (
    groupId: string,
    statementId: string,
    value: EvaluationRatingValue,
  ) => {
    setAnswers((prev) => {
      const current = prev[groupId];
      const nested =
        current && typeof current === "object" && !Array.isArray(current)
          ? { ...current }
          : {};
      return { ...prev, [groupId]: { ...nested, [statementId]: value } };
    });
    setMissingIds((prev) =>
      prev.filter((missingId) => missingId !== statementId),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = missingRequiredAnswers(questions, answers);
    if (missing.length > 0) {
      setMissingIds(missing);
      showToast("Please complete all required questions.", "error");
      return;
    }
    if (!assessmentId) {
      showToast(
        "This program does not have an evaluation yet. Ask a team lead to open this page once so it can be set up.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        showToast("You need to be signed in to submit.", "error");
        return;
      }

      await saveDataToDB("assessment_response", crypto.randomUUID(), {
        assessment_id: assessmentId,
        participant_id: user.id,
        answers,
        score: null,
        submitted_at: new Date().toISOString(),
      });

      try {
        const existingCerts = await getRowsFromDB<Certificate>("certificate");
        const alreadyHasCert = existingCerts.some(
          (cert) =>
            cert.participant_id === user.id && cert.program_id === programId,
        );
        if (!alreadyHasCert) {
          await saveDataToDB("certificate", crypto.randomUUID(), {
            participant_id: user.id,
            program_id: programId,
            issued_at: new Date().toISOString(),
            pdf_link: null,
          });
        }
      } catch (certError) {
        console.error(
          "Certificate creation failed (evaluation still saved):",
          certError,
        );
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      showToast("Failed to submit evaluation. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const questionNumberById = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((question, index) => {
      map.set(question.id, index + 1);
    });
    return map;
  }, [questions]);

  const questionBlocks = useMemo(
    () =>
      questions.map((question) => ({
        question,
        showSection: Boolean(question.section),
      })),
    [questions],
  );

  const renderQuestion = (question: PostActivityQuestion) => {
    const number = questionNumberById.get(question.id) ?? 0;
    const required = isRequired(question);
    const markedMissing = missingIds.includes(question.id);

    if (question.type === "text") {
      const fieldId = `eval-field-${question.id}`;
      return (
        <div
          key={question.id}
          className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3"
        >
          <QuestionLabel
            htmlFor={fieldId}
            number={number}
            question={question.question}
            required={required}
          />
          {question.multiline ? (
            <textarea
              id={fieldId}
              rows={4}
              required={required}
              value={String(answers[question.id] ?? "")}
              onChange={(event) => setAnswer(question.id, event.target.value)}
              placeholder={question.placeholder ?? "Type your response here..."}
              className={TEXTAREA_CLASS}
            />
          ) : (
            <input
              id={fieldId}
              type={question.input === "email" ? "email" : "text"}
              required={required}
              value={String(answers[question.id] ?? "")}
              onChange={(event) => setAnswer(question.id, event.target.value)}
              placeholder={question.placeholder}
              className={INPUT_CLASS}
            />
          )}
          {markedMissing && (
            <p className="text-[11px] font-bold text-rose-500">
              This question is required.
            </p>
          )}
        </div>
      );
    }

    if (question.type === "date") {
      const fieldId = `eval-field-${question.id}`;
      return (
        <div
          key={question.id}
          className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3"
        >
          <QuestionLabel
            htmlFor={fieldId}
            number={number}
            question={question.question}
            required={required}
          />
          <input
            id={fieldId}
            type="date"
            required={required}
            value={String(answers[question.id] ?? "")}
            onChange={(event) => setAnswer(question.id, event.target.value)}
            className={INPUT_CLASS}
          />
          {markedMissing && (
            <p className="text-[11px] font-bold text-rose-500">
              This question is required.
            </p>
          )}
        </div>
      );
    }

    if (question.type === "choice") {
      return (
        <fieldset
          key={question.id}
          aria-label={`${number}. ${question.question}`}
          className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3"
        >
          <QuestionLabel
            number={number}
            question={question.question}
            required={required}
          />
          <div className="flex flex-col gap-2">
            {question.options.map((option) => {
              const selected = answers[question.id] === option;
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    selected
                      ? "bg-white border-[#4ec2bb] text-slate-800"
                      : "bg-white/70 border-slate-200 text-slate-600 hover:border-[#4ec2bb]/60"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={selected}
                    onChange={() => setAnswer(question.id, option)}
                    className="accent-[#2a7797]"
                  />
                  {option}
                </label>
              );
            })}
          </div>
          {markedMissing && (
            <p className="text-[11px] font-bold text-rose-500">
              Please select one option.
            </p>
          )}
        </fieldset>
      );
    }

    if (question.type === "rating_group") {
      const nested =
        answers[question.id] &&
        typeof answers[question.id] === "object" &&
        !Array.isArray(answers[question.id])
          ? (answers[question.id] as Record<string, string | number>)
          : {};

      return (
        <fieldset
          key={question.id}
          aria-label={`${number}. ${question.question}`}
          className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-4"
        >
          <QuestionLabel
            number={number}
            question={question.question}
            required={required}
          />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select one rating per statement
          </p>
          <div className="space-y-3">
            {question.statements.map((statement) => {
              const statementMissing = missingIds.includes(statement.id);
              return (
                <div
                  key={statement.id}
                  className={`bg-white/80 border p-3 rounded-xl space-y-2 ${
                    statementMissing ? "border-rose-300" : "border-slate-200/80"
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-700 leading-snug">
                    {statement.statement}
                  </p>
                  <LikertScale
                    name={statement.statement}
                    value={nested[statement.id]}
                    allowNA={question.allowNA !== false}
                    onChange={(value) =>
                      setGroupAnswer(question.id, statement.id, value)
                    }
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2a7797]/10 text-[#2a7797]">
          1. Submit Evaluation
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
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2a7797]" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              {EVALUATION_FORM_TITLE}
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            {EVALUATION_FORM_INTRO}
          </p>
          <p className="text-[10px] font-bold text-slate-400">
            * Indicates a required question.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
          </div>
        ) : !isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questionBlocks.map(({ question, showSection }) => (
              <React.Fragment key={question.id}>
                {showSection && (
                  <div className="pt-2 space-y-2">
                    <h3 className="text-[11px] font-extrabold text-[#2a7797] uppercase tracking-[1.5px]">
                      {question.section}
                    </h3>
                    {question.sectionIntro && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {question.sectionIntro}
                      </p>
                    )}
                    {question.type === "rating_group" && (
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
                    )}
                  </div>
                )}
                {renderQuestion(question)}
              </React.Fragment>
            ))}

            <DataPrivacyNotice />
            <p className="text-[11px] text-slate-400">{EVALUATION_DATA_PRIVACY}</p>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-slate-300/20 ${
                isSubmitting
                  ? "bg-slate-400 text-white cursor-not-allowed"
                  : "bg-[#2a7797] text-white hover:bg-[#1f5a73] active:scale-[0.99]"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : submitLabel}
            </button>
          </form>
        ) : (
          <div className="bg-[#f2f2f2] border border-slate-300/60 rounded-[24px] p-8 text-center space-y-4 max-w-md mx-auto">
            <CheckCircle className="w-12 h-12 text-[#4ec2bb] mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-sans">
                Evaluation Submitted
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your post-activity evaluation has been logged
                {isTraining
                  ? ". A certificate record has been added to the registry."
                  : ". A formal internship certificate has been created."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={routes.certificate(programId)}
                className="w-full py-2 bg-[#4ec2bb] text-white font-bold text-xs rounded-xl hover:bg-[#3db0a9] transition-colors shadow-sm text-center block"
              >
                Go View Certificate Registry
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setMissingIds([]);
                }}
                className="w-full py-2 bg-white text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                Submit New Evaluation Track
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
