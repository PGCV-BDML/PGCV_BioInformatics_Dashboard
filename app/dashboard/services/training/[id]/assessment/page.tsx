"use client";

import React, { useState, use, useEffect } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Award,
  HelpCircle,
  Star,
} from "lucide-react";
import { getRowsFromDB, getCurrentUser, saveDataToDB } from "@/lib/supabase";
import type { Question, Assessment, AssessmentResponse } from "@/types/database";

/* ================= TYPES & CONFIG ================= */

export default function AssessmentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Resolved parameter placeholder to ensure dynamic context alignment if API tracking is added later
  const resolvedParams = use(params);

  const [activeTest, setActiveTest] = useState<"pre" | "post" | null>(null);
  const [preTestQuestions, setPreTestQuestions] = useState<Question[]>([]);
  const [postTestQuestions, setPostTestQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number | string>
  >({});
  const [scoreResult, setScoreResult] = useState<number | null>(null);
  const [existingResponses, setExistingResponses] = useState<AssessmentResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentIds, setAssessmentIds] = useState<{ pre?: string; post?: string }>({});

  useEffect(() => {
    const load = async () => {
      const [assessments, responses, user] = await Promise.all([
        getRowsFromDB<Assessment>("assessment"),
        getRowsFromDB<AssessmentResponse>("assessment_response"),
        getCurrentUser(),
      ]);
      const programAssessments = assessments.filter(
        (a) => a.program_id === resolvedParams.id,
      );
      const pre = programAssessments.find((a) => a.type === "pre_test");
      const post = programAssessments.find((a) => a.type === "post_test");
      setPreTestQuestions(pre?.questions ?? []);
      setPostTestQuestions(post?.questions ?? []);
      setAssessmentIds({ pre: pre?.id, post: post?.id });
      const myResponses = responses.filter(
        (r) => r.participant_id === user?.id,
      );
      setExistingResponses(myResponses);
    };
    load();
  }, [resolvedParams.id]);

  const handleStartTest = (type: "pre" | "post") => {
    setActiveTest(type);
    setSelectedAnswers({});
    setScoreResult(null);
  };

  /** Render a single question based on its type */
  const renderQuestion = (q: Question, idx: number) => {
    if (q.type === "mcq") {
      return (
        <div
          key={q.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          <div className="flex gap-2 items-start">
            <HelpCircle className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
            <h4 className="text-sm font-bold text-slate-800 leading-snug">
              {idx + 1}. {q.question}
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-2 pl-6">
            {q.options.map((opt, oIdx) => (
              <label
                key={oIdx}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  selectedAnswers[q.id] === oIdx
                    ? "border-[#4ec2bb] bg-[#f2fdfc]"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={selectedAnswers[q.id] === oIdx}
                  onChange={() =>
                    setSelectedAnswers({
                      ...selectedAnswers,
                      [q.id]: oIdx,
                    })
                  }
                  className="text-[#4ec2bb] focus:ring-[#4ec2bb]"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === "rating") {
      const scale = q.scale || 5;
      return (
        <div
          key={q.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          <div className="flex gap-2 items-start">
            <Star className="w-4 h-4 text-[#f57f17] shrink-0 mt-0.5" />
            <h4 className="text-sm font-bold text-slate-800 leading-snug">
              {idx + 1}. {q.question}
            </h4>
          </div>
          <div className="flex items-center gap-2 pl-6">
            {Array.from({ length: scale }, (_, i) => i + 1).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() =>
                  setSelectedAnswers({ ...selectedAnswers, [q.id]: val })
                }
                className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                  selectedAnswers[q.id] === val
                    ? "bg-[#f57f17] text-white shadow-md"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {val}
              </button>
            ))}
            {/* ponytail: numbered buttons 1–scale. Star icons or a slider would be nicer but more work. */}
          </div>
        </div>
      );
    }

    if (q.type === "text") {
      return (
        <div
          key={q.id}
          className="bg-white border border-slate-200 p-5 rounded-[20px] space-y-4 shadow-sm"
        >
          <div className="flex gap-2 items-start">
            <HelpCircle className="w-4 h-4 text-[#2a7797] shrink-0 mt-0.5" />
            <h4 className="text-sm font-bold text-slate-800 leading-snug">
              {idx + 1}. {q.question}
            </h4>
          </div>
          <div className="pl-6">
            {q.multiline ? (
              <textarea
                rows={3}
                value={(selectedAnswers[q.id] as string) ?? ""}
                onChange={(e) =>
                  setSelectedAnswers({ ...selectedAnswers, [q.id]: e.target.value })
                }
                placeholder="Type your answer here..."
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2.5 text-slate-700 bg-white"
              />
            ) : (
              <input
                type="text"
                value={(selectedAnswers[q.id] as string) ?? ""}
                onChange={(e) =>
                  setSelectedAnswers({ ...selectedAnswers, [q.id]: e.target.value })
                }
                placeholder="Type your answer here..."
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2.5 text-slate-700 bg-white"
              />
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const calculateScore = async () => {
    setIsSubmitting(true);
    try {
      const questions = activeTest === "pre" ? preTestQuestions : postTestQuestions;
      const assessmentId = activeTest === "pre" ? assessmentIds.pre : assessmentIds.post;
      if (!assessmentId || questions.length === 0) return;
      const user = await getCurrentUser();
      if (!user) return;

      // Only MCQ questions contribute to the score
      const mcqQuestions = questions.filter((q): q is Question & { type: "mcq" } => q.type === "mcq");
      const correctCount = mcqQuestions.filter(
        (q) => selectedAnswers[q.id] === q.correct,
      ).length;
      const finalScore = mcqQuestions.length > 0
        ? Math.round((correctCount / mcqQuestions.length) * 100)
        : 0;

      setScoreResult(finalScore);

      // Ponytail: rating and text answers are stored but not scored
      const typedAnswers: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(selectedAnswers)) {
        typedAnswers[key] = val;
      }

      await saveDataToDB("assessment_response", crypto.randomUUID(), {
        assessment_id: assessmentId,
        participant_id: user.id,
        answers: typedAnswers,
        score: finalScore,
        submitted_at: new Date().toISOString(),
      });
    } catch {
      // Submission failed — isSubmitting will be reset in finally
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
      {!activeTest ? (
        <div className="space-y-6">
          {/* Internal Title Header inside Workspace Panel */}
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

          {/* Pre-Test and Post-Test Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full rounded-[20px] p-5 border border-slate-200/90 bg-white space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#4ec2bb]" />
                <h3 className="text-sm font-bold text-slate-800">Pre-Test</h3>
              </div>
              <p className="text-xs text-slate-500">
                {preTestQuestions.length > 0
                  ? `${preTestQuestions.length} questions`
                  : "No pre-test configured for this program."}
              </p>
              {preTestQuestions.length > 0 && (
                <button
                  onClick={() => handleStartTest("pre")}
                  className="w-full text-[11px] font-bold px-4 py-2 bg-[#4ec2bb] text-white rounded-xl hover:bg-[#3db0a9] transition-all"
                >
                  {existingResponses.some((r) => r.assessment_id === assessmentIds.pre)
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
                  : "No post-test configured for this program."}
              </p>
              {postTestQuestions.length > 0 && (
                <button
                  onClick={() => handleStartTest("post")}
                  className="w-full text-[11px] font-bold px-4 py-2 bg-[#eaf7f6] text-[#247974] border border-[#4ec2bb]/20 rounded-xl hover:bg-[#deefed] transition-all"
                >
                  {existingResponses.some((r) => r.assessment_id === assessmentIds.post)
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
              onClick={() => setActiveTest(null)}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard List
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-slate-100 text-slate-600">
              {activeTest === "pre" ? "Pre-Test" : "Post-Test"}
            </span>
          </div>

          {scoreResult === null ? (
            <div className="space-y-6 max-w-3xl">
              {(activeTest === "pre" ? preTestQuestions : postTestQuestions).map((q, idx) =>
                renderQuestion(q, idx)
              )}

              <button
                onClick={calculateScore}
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all ${
                  isSubmitting
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-[#2a7797] hover:bg-[#1f5a73]"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit Answers & Calculate Score"}
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
                  Your test answers have been saved to the database logs
                  repository.
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
                onClick={() => setActiveTest(null)}
                className="w-full py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Return to Matrix Panel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
