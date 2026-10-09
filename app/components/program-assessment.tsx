"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  Lock,
  Star,
} from "lucide-react";
import { usePortal } from "@/app/components/portal-context";
import ProgramAssessmentSummary from "@/app/components/program-assessment-summary";
import { useToast } from "@/app/components/toast";
import {
  asStringArray,
  formatAnswer,
  scoreMcqPercent,
  toggleMultiChoiceOption,
} from "@/lib/assessment-form";
import type { ProgramType } from "@/lib/routes";
import { getCurrentUser, getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import type { Assessment, AssessmentResponse, Question } from "@/types/database";

function suggestedTimeHint(questions: Question[]): string | null {
  for (const question of questions) {
    const match = question.sectionIntro?.match(/Suggested time: [^.]+\./);
    if (match) return match[0];
  }
  return null;
}

type AssessmentAnswer = number | string | string[];

type TestKind = "pre" | "post";

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
  const [activeTest, setActiveTest] = useState<TestKind | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
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
  const [openTests, setOpenTests] = useState<Record<TestKind, boolean>>({
    pre: false,
    post: false,
  });

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
        setOpenTests({
          pre: pre?.is_open ?? true,
          post: post?.is_open ?? true,
        });
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

  const submittedResponse = (type: TestKind) => {
    const assessmentId = type === "pre" ? assessmentIds.pre : assessmentIds.post;
    return assessmentId
      ? existingResponses.find((row) => row.assessment_id === assessmentId)
      : undefined;
  };

  const handleStartTest = (type: TestKind) => {
    if (submittedResponse(type) || !openTests[type]) return;
    setActiveTest(type);
    setIsReviewing(false);
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
    if (!activeTest) return;
    setIsSubmitting(true);
    try {
      const questions =
        activeTest === "pre" ? preTestQuestions : postTestQuestions;
      const assessmentId =
        activeTest === "pre" ? assessmentIds.pre : assessmentIds.post;
      if (!assessmentId || questions.length === 0) return;
      if (submittedResponse(activeTest)) {
        showToast("You have already submitted this test.", "error");
        return;
      }
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

      const responseId = crypto.randomUUID();
      const submittedAt = new Date().toISOString();
      await saveDataToDB("assessment_response", responseId, {
        assessment_id: assessmentId,
        participant_id: user.id,
        answers: typedAnswers,
        score: finalScore,
        submitted_at: submittedAt,
      });

      setScoreResult(finalScore);
      setExistingResponses((prev) => [
        ...prev,
        {
          id: responseId,
          assessment_id: assessmentId,
          participant_id: user.id,
          answers: typedAnswers,
          score: finalScore,
          submitted_at: submittedAt,
        },
      ]);
    } catch (error) {
      console.error("Assessment submission failed:", error);
      showToast(
        "Failed to submit. The test may be closed or already submitted.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReviewList = (questions: Question[]) => {
    let number = 0;
    return questions.map((question) => {
      if (question.section) number = 0;
      number += 1;
      const answer = formatAnswer(question, selectedAnswers[question.id]);
      return (
        <Fragment key={question.id}>
          {question.section ? (
            <h3 className="pt-2 text-[11px] font-extrabold text-[#2a7797] uppercase tracking-[1.5px]">
              {question.section}
            </h3>
          ) : null}
          <div className="bg-white border border-slate-200 p-4 rounded-[16px] space-y-1.5 shadow-sm">
            <p className="text-xs font-bold text-slate-800 leading-snug">
              {number}. {question.question}
            </p>
            {answer ? (
              <p className="text-xs text-slate-600 pl-4">{answer}</p>
            ) : (
              <p className="text-xs font-semibold text-amber-600 pl-4">
                No answer
              </p>
            )}
          </div>
        </Fragment>
      );
    });
  };

  const emptyPreLabel = isTraining
    ? "No pre-test configured for this program."
    : "No pre-test configured for this internship.";
  const emptyPostLabel = isTraining
    ? "No post-test configured for this program."
    : "No post-test configured for this internship.";
  const preTimeHint = suggestedTimeHint(preTestQuestions);
  const postTimeHint = suggestedTimeHint(postTestQuestions);

  const renderTestCard = (type: TestKind) => {
    const isPre = type === "pre";
    const label = isPre ? "Pre-Test" : "Post-Test";
    const questions = isPre ? preTestQuestions : postTestQuestions;
    const timeHint = isPre ? preTimeHint : postTimeHint;
    const submitted = submittedResponse(type);
    const isOpen = openTests[type];
    return (
      <div className="w-full rounded-[20px] p-5 border border-slate-200/90 bg-white space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            className={`w-4 h-4 ${isPre ? "text-[#4ec2bb]" : "text-[#2a7797]"}`}
          />
          <h3 className="text-sm font-bold text-slate-800">{label}</h3>
        </div>
        <p className="text-xs text-slate-500">
          {questions.length > 0
            ? `${questions.length} questions`
            : isPre
              ? emptyPreLabel
              : emptyPostLabel}
        </p>
        {timeHint ? <p className="text-xs text-slate-500">{timeHint}</p> : null}
        {questions.length > 0 &&
          (submitted ? (
            <div className="flex items-center justify-center gap-1.5 w-full text-[11px] font-bold px-4 py-2 bg-slate-100 text-slate-600 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#359b95]" />
              Submitted
              {submitted.score != null ? ` · Score ${submitted.score}%` : ""}
            </div>
          ) : !isOpen ? (
            <div className="flex items-center justify-center gap-1.5 w-full text-[11px] font-bold px-4 py-2 bg-slate-100 text-slate-400 rounded-xl">
              <Lock className="w-3.5 h-3.5" />
              Not open yet
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleStartTest(type)}
              className={
                isPre
                  ? "w-full text-[11px] font-bold px-4 py-2 bg-[#4ec2bb] text-white rounded-xl hover:bg-[#3db0a9] transition-all"
                  : "w-full text-[11px] font-bold px-4 py-2 bg-[#eaf7f6] text-[#247974] border border-[#4ec2bb]/20 rounded-xl hover:bg-[#deefed] transition-all"
              }
            >
              Start {label}
            </button>
          ))}
      </div>
    );
  };


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
          <p className="text-xs text-slate-500 leading-relaxed">
            Complete both tests while signed in. Your dashboard account identifies
            you and pairs pre- and post-test responses. Each test can be
            submitted once, so review your answers before submitting.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTestCard("pre")}
            {renderTestCard("post")}
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

          {scoreResult === null && !isReviewing ? (
            <div className="space-y-6 max-w-3xl">
              {renderQuestionList(
                activeTest === "pre" ? preTestQuestions : postTestQuestions,
              )}

              <button
                type="button"
                onClick={() => {
                  setIsReviewing(true);
                  window.scrollTo?.({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all bg-[#2a7797] hover:bg-[#1f5a73]"
              >
                Review Answers
              </button>
            </div>
          ) : scoreResult === null ? (
            <div className="space-y-6 max-w-3xl">
              <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4 space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Review your answers
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Check your answers below. Once you submit, you can&apos;t
                  change them or take this test again.
                </p>
              </div>
              <div className="space-y-3">
                {renderReviewList(
                  activeTest === "pre" ? preTestQuestions : postTestQuestions,
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 font-bold text-xs rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Edit Answers
                </button>
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
                  {isSubmitting ? "Submitting..." : "Submit Final Answers"}
                </button>
              </div>
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
