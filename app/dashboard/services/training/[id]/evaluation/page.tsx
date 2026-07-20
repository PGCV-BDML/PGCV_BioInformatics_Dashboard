"use client";

import React, { useState, use, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Star, Send, CheckCircle, Award } from "lucide-react";
import { getRowsFromDB, getCurrentUser, saveDataToDB } from "@/lib/supabase";
import type { Assessment, Question } from "@/types/database";

export default function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  // Form Inputs State
  const [participantName, setParticipantName] = useState("Alex Mercer, Ph.D.");
  const [selectedProgram, setSelectedProgram] = useState(
    "Advanced Bioinformatics Sequencing & GATK Architecture",
  );
  const [formValues, setFormValues] = useState<Record<string, number | string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const assessments = await getRowsFromDB<Assessment>("assessment");
        const evalAssessment = assessments.find(
          (a) => a.program_id === resolvedParams.id && a.type === "evaluation",
        );
        if (evalAssessment?.questions) {
          setAssessmentId(evalAssessment.id);
          setQuestions(evalAssessment.questions as Question[]);
        }
      } catch (err) {
        console.error("Error loading evaluation questions:", err);
      }
    };
    load();
  }, [resolvedParams.id]);

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentId) return;
    try {
      const user = await getCurrentUser();
      if (!user) return;
      await saveDataToDB("assessment_response", crypto.randomUUID(), {
        assessment_id: assessmentId,
        participant_id: user.id,
        answers: formValues,
        score: null, // ponytail: evaluation is unscored
        submitted_at: new Date().toISOString(),
      });
      // Create a certificate record for this completed evaluation
      try {
        await saveDataToDB("certificate", crypto.randomUUID(), {
          participant_id: user.id,
          program_id: resolvedParams.id,
          issued_at: new Date().toISOString(),
          pdf_link: null,
        });
      } catch (certErr) {
        console.error("Certificate creation failed (evaluation still saved):", certErr);
      }
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting evaluation:", err);
    }
  };

  /** Render a single evaluation question (rating or text only) */
  const renderQuestion = (q: Question) => {
    if (q.type === "rating") {
      const scale = q.scale || 5;
      return (
        <div
          key={q.id}
          className="bg-white border border-slate-200/80 p-4 rounded-[16px] space-y-2"
        >
          <label className="text-xs font-bold text-slate-700 block leading-snug">
            {q.question}
          </label>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: scale }, (_, i) => i + 1).map((starValue) => (
              <button
                type="button"
                key={starValue}
                onClick={() =>
                  setFormValues({
                    ...formValues,
                    [q.id]: starValue,
                  })
                }
                className="focus:outline-none transition-transform active:scale-95"
              >
                <Star
                  className={`w-5 h-5 ${
                    starValue <= Number(formValues[q.id])
                      ? "fill-[#f57f17] text-[#f57f17]"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
            {/* ponytail: star-based rating. Numbered buttons or a slider would be an alternative. */}
          </div>
        </div>
      );
    }

    if (q.type === "text") {
      return (
        <div
          key={q.id}
          className="bg-white border border-slate-200/80 p-4 rounded-[16px] space-y-2"
        >
          <label className="text-xs font-bold text-slate-700 block leading-snug">
            {q.question}
          </label>
          <textarea
            rows={q.multiline ? 3 : 2}
            value={formValues[q.id] ?? ""}
            onChange={(e) =>
              setFormValues({
                ...formValues,
                [q.id]: e.target.value,
              })
            }
            placeholder="Type your response here..."
            className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2 text-slate-600 bg-slate-50/50"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Sub-tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2a7797]/10 text-[#2a7797]">
          1. Submit Evaluation
        </span>
        <Link
          href={`/dashboard/services/training/${resolvedParams.id}/certificate`}
          className="px-4 py-2 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          2. Certificate Registry{" "}
          <Award className="w-3.5 h-3.5 text-[#f57f17]" />
        </Link>
      </div>

      {/* Main Workspace Card Area */}
      <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        <div className="space-y-6 max-w-2xl">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2a7797]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Course Evaluation Survey
              </h2>
            </div>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Participant Full Name
                  </label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2.5 text-slate-700 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Training Track
                  </label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2.5 text-slate-700 bg-white"
                  >
                    <option value="Advanced Bioinformatics Sequencing & GATK Architecture">
                      Advanced Bioinformatics Sequencing & GATK Architecture
                    </option>
                    <option value="16S Metagenomics Analysis Framework">
                      16S Metagenomics Analysis Framework
                    </option>
                  </select>
                </div>
              </div>

              {questions.length > 0 && (
                <div className="space-y-3 pt-2">
                  {questions.map((q) => renderQuestion(q))}
                </div>
              )}
              {questions.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  No evaluation questions configured for this program.
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2a7797] text-white font-bold text-xs rounded-xl hover:bg-[#1f5a73] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Submit Metrics & Generate Award
                Certificate
              </button>
            </form>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center space-y-4 max-w-md mx-auto">
              <CheckCircle className="w-12 h-12 text-[#4ec2bb] mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Evaluation Submitted!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your response was logged. A certificate has been inserted into
                  your records workspace registry.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/dashboard/services/training/${resolvedParams.id}/certificate`}
                  className="w-full py-2 bg-[#4ec2bb] text-white font-bold text-xs rounded-xl hover:bg-[#3db0a9] transition-colors shadow-sm text-center block"
                >
                  Go View Certificates Table
                </Link>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormValues({});
                  }}
                  className="w-full py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Submit New Evaluation Track
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
