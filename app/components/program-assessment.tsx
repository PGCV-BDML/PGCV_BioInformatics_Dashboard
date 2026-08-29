"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  ClipboardCheck,
  HelpCircle,
  Star,
} from "lucide-react";
import { usePortal } from "@/app/components/portal-context";
import ProgramAssessmentSummary from "@/app/components/program-assessment-summary";
import { useToast } from "@/app/components/toast";
import {
  asStringArray,
  scoreMcqPercent,
  toggleMultiChoiceOption,
} from "@/lib/assessment-form";
import type { ProgramType } from "@/lib/routes";
import { getCurrentUser, getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import type { Assessment, AssessmentResponse, Question } from "@/types/database";

type AssessmentAnswer = number | string | string[];

type ProgramAssessmentProps = {
  programId: string;
  programType: ProgramType;
};

export default function ProgramAssessment({
  programId,
  programType,
}: ProgramAssessmentProps) {
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
      <ProgramAssessmentSummary
        programId={programId}
        programType={programType}
      />
    );
  }

  return (
    <LearnerAssessmentForm programId={programId} programType={programType} />
  );
}

function LearnerAssessmentForm({
  programId,
  programType,
}: ProgramAssessmentProps) {
  const { showToast } = useToast();
  const isTraining = programType === "training";
  const [activeTest, setActiveTest] = useState<"pre" | "post" | null>(null);
  const [preTestQuestions, setPreTestQuestions] = useState<Question[]>([]);
  const [postTestQuestions, setPostTestQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, AssessmentAnswer>
  >({});
  const [scoreResult, setScoreResult] = useState<number | null>(null);
  const [existingResponses, setExistingResponses] = useState<
    AssessmentResponse[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentIds, setAssessmentIds] = useState<{
    pre?: string;
    post?: string;
  }>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [assessments, responses, user] = await Promise.all([
          getRowsFromDB<Assessment>("assessment"),
          getRowsFromDB<AssessmentResponse>("assessment_response"),
          getCurrentUser(),
        ]);
        const programAssessments = assessments.filter(
          (row) => row.program_id === programId,
        );
        const pre = programAssessments.find((row) => row.type === "pre_test");
        const post = programAssessments.find((row) => row.type === "post_test");
        setPreTestQuestions(pre?.questions ?? []);
        setPostTestQuestions(post?.questions ?? []);
        setAssessmentIds({ pre: pre?.id, post: post?.id });
        setExistingResponses(
          responses.filter((row) => row.participant_id === user?.id),
        );
      } catch (error) {
        console.error("Failed to load assessment data:", error);
        showToast("Failed to load the tests.", "error");
      }
    };
    void load();
  }, [programId, showToast]);

  const handleStartTest = (type: "pre" | "post") => {
    setActiveTest(type);
    setSelectedAnswers({});
    setScoreResult(null);
  };

  const renderQuestion = (question: Question, idx: number) => {
    const heading = (
      <div className="flex gap-2 items-start">
        {question.type === "rating" ? (
          <Star className="w-4 h-4 text-[#f57f17] shrink-0 mt-0.5" />
        ) : (
          <HelpCircle className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
        )}
        <h4 className="text-sm font-bold text-slate-800 leading-snug">
          {idx}. {question.question}
        </h4>
      </div>
    );

    if (question.type === "mcq") {
      return (
        <div
          key={question.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          {heading}
          <div className="grid grid-cols-1 gap-2 pl-6">
            {question.options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  selectedAnswers[question.id] === optionIndex
                    ? "border-[#4ec2bb] bg-[#f2fdfc]"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={selectedAnswers[question.id] === optionIndex}
                  onChange={() =>
                    setSelectedAnswers({
                      ...selectedAnswers,
                      [question.id]: optionIndex,
                    })
                  }
                  className="text-[#4ec2bb] focus:ring-[#4ec2bb]"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (question.type === "choice") {
      const selected = question.multiple
        ? asStringArray(selectedAnswers[question.id])
        : selectedAnswers[question.id];
      return (
        <div
          key={question.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          {heading}
          <div className="grid grid-cols-1 gap-2 pl-6">
            {question.options.map((option) => {
              const isChecked = question.multiple
                ? (selected as string[]).includes(option)
                : selected === option;
              return (
                <label
                  key={option}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    isChecked
                      ? "border-[#4ec2bb] bg-[#f2fdfc]"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type={question.multiple ? "checkbox" : "radio"}
                    name={question.id}
                    checked={isChecked}
                    onChange={() =>
                      setSelectedAnswers({
                        ...selectedAnswers,
                        [question.id]: question.multiple
                          ? toggleMultiChoiceOption(
                              asStringArray(selectedAnswers[question.id]),
                              option,
                            )
                          : option,
                      })
                    }
                    className="text-[#4ec2bb] focus:ring-[#4ec2bb]"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === "rating") {
      const scale = question.scale || 5;
      return (
        <div
          key={question.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          {heading}
          <div className="flex items-center gap-2 pl-6">
            {Array.from({ length: scale }, (_, i) => i + 1).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() =>
                  setSelectedAnswers({ ...selectedAnswers, [question.id]: val })
                }
                className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                  selectedAnswers[question.id] === val
                    ? "bg-[#f57f17] text-white shadow-md"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (question.type === "text") {
      return (
        <div
          key={question.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          {heading}
          <div className="pl-6">
            {question.multiline ? (
              <textarea
                rows={3}
                value={(selectedAnswers[question.id] as string) ?? ""}
                onChange={(event) =>
                  setSelectedAnswers({
                    ...selectedAnswers,
                    [question.id]: event.target.value,
                  })
                }
                placeholder={question.placeholder ?? "Type your answer here..."}
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2.5 text-slate-700 bg-white"
              />
            ) : (
              <input
                type="text"
                value={(selectedAnswers[question.id] as string) ?? ""}
                onChange={(event) =>
                  setSelectedAnswers({
                    ...selectedAnswers,
                    [question.id]: event.target.value,
                  })
                }
                placeholder={question.placeholder ?? "Type your answer here..."}
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2.5 text-slate-700 bg-white"
              />
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderQuestionList = (questions: Question[]) => {
    let number = 0;
    return questions.map((question) => {
      if (question.section) number = 0;
      number += 1;
      return (
        <Fragment key={question.id}>
          {question.section ? (
            <div className="pt-2 space-y-2">
              <h3 className="text-[11px] font-extrabold text-[#2a7797] uppercase tracking-[1.5px]">
                {question.section}
              </h3>
              {question.sectionIntro ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {question.sectionIntro}
                </p>
              ) : null}
            </div>
          ) : null}
          {renderQuestion(question, number)}
        </Fragment>
      );
    });
  };

  const calculateScore = async () => {
    setIsSubmitting(true);
    try {
      const questions =
        activeTest === "pre" ? preTestQuestions : postTestQuestions;
      const assessmentId =
        activeTest === "pre" ? assessmentIds.pre : assessmentIds.post;
      if (!assessmentId || questions.length === 0) return;
      const user = await getCurrentUser();
      if (!user) {
        showToast("You need to be signed in to submit.", "error");
        return;
      }

      const finalScore = scoreMcqPercent(questions, selectedAnswers);

      const typedAnswers: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(selectedAnswers)) {
        typedAnswers[key] = val;
      }

      const existingResponse = existingResponses.find(
        (row) =>
          row.assessment_id === assessmentId && row.participant_id === user.id,
      );
      const responseId = existingResponse?.id ?? crypto.randomUUID();

      await saveDataToDB("assessment_response", responseId, {
        assessment_id: assessmentId,
        participant_id: user.id,
        answers: typedAnswers,
        score: finalScore,
        submitted_at: new Date().toISOString(),
      });

      setScoreResult(finalScore);

      if (!existingResponse) {
        setExistingResponses((prev) => [
          ...prev,
          {
            id: responseId,
            assessment_id: assessmentId,
            participant_id: user.id,
            answers: typedAnswers,
            score: finalScore,
            submitted_at: new Date().toISOString(),
          },
        ]);
      } else {
        setExistingResponses((prev) =>
          prev.map((row) =>
            row.id === responseId
              ? {
                  ...row,
                  score: finalScore,
                  answers: typedAnswers,
                  submitted_at: new Date().toISOString(),
                }
              : row,
          ),
        );
      }
    } catch (error) {
      console.error("Assessment submission failed:", error);
      showToast("Failed to submit assessment. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const emptyPreLabel = isTraining
    ? "No pre-test configured for this program."
    : "No pre-test configured for this internship.";
  const emptyPostLabel = isTraining
    ? "No post-test configured for this program."
    : "No post-test configured for this internship.";

  return (
    <div className="bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
      {!activeTest ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#2a7797]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Pre / Post Tests
              </h2>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-[#359b95] bg-[#e6f7f6] px-4 py-1.5 rounded-full uppercase">
              Assessments Panel
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full rounded-[20px] p-5 border border-slate-200/90 bg-white space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#4ec2bb]" />
                <h3 className="text-sm font-bold text-slate-800">Pre-Test</h3>
              </div>
              <p className="text-xs text-slate-500">
                {preTestQuestions.length > 0
                  ? `${preTestQuestions.length} questions`
                  : emptyPreLabel}
              </p>
              {preTestQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleStartTest("pre")}
                  className="w-full text-[11px] font-bold px-4 py-2 bg-[#4ec2bb] text-white rounded-xl hover:bg-[#3db0a9] transition-all"
                >
                  {existingResponses.some(
                    (row) => row.assessment_id === assessmentIds.pre,
                  )
                    ? "Review Pre-Test"
                    : "Start Pre-Test"}
                </button>
              )}
            </div>

            <div className="w-full rounded-[20px] p-5 border border-slate-200/90 bg-white space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#2a7797]" />
                <h3 className="text-sm font-bold text-slate-800">Post-Test</h3>
              </div>
              <p className="text-xs text-slate-500">
                {postTestQuestions.length > 0
                  ? `${postTestQuestions.length} questions`
                  : emptyPostLabel}
              </p>
              {postTestQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleStartTest("post")}
                  className="w-full text-[11px] font-bold px-4 py-2 bg-[#eaf7f6] text-[#247974] border border-[#4ec2bb]/20 rounded-xl hover:bg-[#deefed] transition-all"
                >
                  {existingResponses.some(
                    (row) => row.assessment_id === assessmentIds.post,
                  )
                    ? "Review Post-Test"
                    : "Start Post-Test"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setActiveTest(null)}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to tests
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-slate-100 text-slate-600">
              {activeTest === "pre" ? "Pre-Test" : "Post-Test"}
            </span>
          </div>

          {scoreResult === null ? (
            <div className="space-y-6 max-w-3xl">
              {renderQuestionList(
                activeTest === "pre" ? preTestQuestions : postTestQuestions,
              )}

              <button
                type="button"
                onClick={() => void calculateScore()}
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all ${
                  isSubmitting
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-[#2a7797] hover:bg-[#1f5a73]"
                }`}
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Submit Answers & Calculate Score"}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-[24px] p-8 max-w-md mx-auto text-center space-y-4 shadow-sm">
              <Award className="w-12 h-12 text-[#f57f17] mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">
                  Assessment Submitted
                </h3>
                <p className="text-xs text-slate-400">
                  Your test answers have been saved.
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 inline-block min-w-[120px]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">
                  Your Score
                </span>
                <span className="text-3xl font-black text-[#2a7797] font-quicksand">
                  {scoreResult}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTest(null)}
                className="w-full py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Return to tests
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
