"use client";

import React, { useState, use } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Award,
  HelpCircle,
  Play,
  Eye,
} from "lucide-react";

/* ================= TYPES & CONFIG ================= */
interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

interface TestData {
  id: string;
  title: string;
  preStatus: "completed" | "none";
  postStatus: "completed" | "pending" | "none";
}

/* ================= INTERNSHIP CURRICULUM TESTS MATRIX ================= */
const MOCK_TESTS_DATA: TestData[] = [
  {
    id: "t1",
    title: "Clinical Environment Setup & High-Throughput Pipelines",
    preStatus: "completed",
    postStatus: "completed",
  },
  {
    id: "t2",
    title: "Variant Quality Score Recalibration (VQSR)",
    preStatus: "completed",
    postStatus: "pending",
  },
  {
    id: "t3",
    title: "RNA-Seq Assembly & Gene Expression Metrics",
    preStatus: "none",
    postStatus: "none",
  },
  {
    id: "t4",
    title: "Pathway Analysis & Interactive Enrichment Tools",
    preStatus: "none",
    postStatus: "none",
  },
  {
    id: "t5",
    title: "Clinical Variant Filtering Protocols",
    preStatus: "none",
    postStatus: "none",
  },
];

/* ================= ADVANCED CLINICAL INTERNSHIP QUESTIONS ================= */
const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    question:
      "When configuring a clinical RNA-Seq pipeline, which normalization metric is mathematically preferred for cross-sample differential expression comparison?",
    options: [
      "RPKM (Reads Per Kilobase Million)",
      "FPKM (Fragments Per Kilobase Million)",
      "TPM (Transcripts Per Million)",
      "DESeq2's Median-of-Ratios (or TMM)",
    ],
    correct: 3,
  },
  {
    id: "q2",
    question:
      "During GATK Variant Discovery, what is the primary structural limitation of Hard Filtering compared to Variant Quality Score Recalibration (VQSR)?",
    options: [
      "Hard filtering requires a high-quality, pre-existing database of true positive sites.",
      "Hard filtering applies rigid, one-dimensional cutoffs that fail to leverage multidimensional annotation profiles, raising false-positive rates.",
      "Hard filtering requires significantly more compute clusters and memory footprint than VQSR.",
      "Hard filtering is only capable of processing single-end sequences.",
    ],
    correct: 1,
  },
];

export default function InternshipAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Resolved parameter placeholder to ensure dynamic context alignment
  const resolvedParams = use(params);

  const [activeTest, setActiveTest] = useState<TestData | null>(null);
  const [testType, setTestType] = useState<"Pre-test" | "Post-test">(
    "Pre-test",
  );
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  const handleStartTest = (test: TestData, type: "Pre-test" | "Post-test") => {
    setActiveTest(test);
    setTestType(type);
    setSelectedAnswers({});
    setScoreResult(null);
  };

  const calculateScore = () => {
    let correctCount = 0;
    MOCK_QUESTIONS.forEach((q) => {
      if (selectedAnswers[q.id] === q.correct) {
        correctCount++;
      }
    });
    const finalScore = Math.round((correctCount / MOCK_QUESTIONS.length) * 100);
    setScoreResult(finalScore);
  };

  return (
    <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
      {!activeTest ? (
        <div className="space-y-8">
          {/* Workspace Title Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#2a7797]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Internship Assessments Matrix
              </h2>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-[#359b95] bg-[#e6f7f6] px-4 py-1.5 rounded-full uppercase">
              Cohort ID: {resolvedParams.id}
            </span>
          </div>

          {/* Separated Sections Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ================= PRE-TESTS SECTION ================= */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40">
                <div className="w-2 h-2 rounded-full bg-[#4ec2bb]" />
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Pre-Test Milestones
                </h3>
              </div>

              <div className="space-y-3">
                {MOCK_TESTS_DATA.map((test) => (
                  <div
                    key={`pre-${test.id}`}
                    className="w-full rounded-[20px] p-5 border border-slate-300/60 bg-[#fffdf8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Assessment {test.id.toUpperCase()}
                      </h4>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                        {test.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                      {test.preStatus === "completed" ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#4ec2bb] bg-[#eaf7f6] px-3 py-1.5 rounded-xl border border-[#4ec2bb]/10">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Passed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartTest(test, "Pre-test")}
                          className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 bg-[#4ec2bb] text-white rounded-xl hover:bg-[#3db0a9] transition-all shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> Start
                          Pre-Test
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= POST-TESTS SECTION ================= */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/40">
                <div className="w-2 h-2 rounded-full bg-[#2a7797]" />
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Post-Test Milestones
                </h3>
              </div>

              <div className="space-y-3">
                {MOCK_TESTS_DATA.map((test) => (
                  <div
                    key={`post-${test.id}`}
                    className="w-full rounded-[20px] p-5 border border-slate-300/60 bg-[#fffdf8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Assessment {test.id.toUpperCase()}
                      </h4>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                        {test.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                      {test.postStatus === "completed" ? (
                        <button
                          onClick={() => handleStartTest(test, "Post-test")}
                          className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 bg-[#eaf7f6] text-[#247974] border border-[#4ec2bb]/20 rounded-xl hover:bg-[#deefed] transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                      ) : test.postStatus === "pending" ? (
                        <button
                          onClick={() => handleStartTest(test, "Post-test")}
                          className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 bg-[#fff8e1] text-[#b78103] border border-[#ffe082] rounded-xl hover:bg-[#fff3cd] transition-all"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#f57f17]" />{" "}
                          Complete Post-Test
                        </button>
                      ) : (
                        <button
                          disabled={test.preStatus !== "completed"}
                          onClick={() => handleStartTest(test, "Post-test")}
                          className={`flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-xl transition-all ${
                            test.preStatus === "completed"
                              ? "bg-[#2a7797] text-white hover:bg-[#1f5a73] shadow-sm"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/40"
                          }`}
                        >
                          Start Post-Test
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Testing Screen View */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <button
              onClick={() => setActiveTest(null)}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Assessments Matrix
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-slate-150 text-slate-600 border border-slate-200/40">
              {testType} — {activeTest.title}
            </span>
          </div>

          {scoreResult === null ? (
            <div className="space-y-6 max-w-3xl">
              {MOCK_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-[#fffdf8] border border-slate-300/60 p-5 rounded-[20px] space-y-4 shadow-sm"
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
                            : "border-slate-300/40 bg-white hover:bg-slate-100/50"
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
              ))}

              <button
                onClick={calculateScore}
                className="px-6 py-2.5 bg-[#2a7797] text-white font-bold text-xs rounded-xl hover:bg-[#1f5a73] shadow-sm transition-all"
              >
                Submit Answers & Save to Portfolio
              </button>
            </div>
          ) : (
            /* Submission Summary Panel */
            <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-8 max-w-md mx-auto text-center space-y-4 shadow-sm">
              <Award className="w-12 h-12 text-[#f57f17] mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">
                  Assessment Complete
                </h3>
                <p className="text-xs text-slate-400">
                  Your answers have been integrated into your core internship
                  portfolio records.
                </p>
              </div>
              <div className="bg-white border border-slate-200/50 rounded-2xl p-4 inline-block min-w-[120px]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block">
                  Scored Record
                </span>
                <span className="text-3xl font-black text-[#2a7797] font-quicksand">
                  {scoreResult}%
                </span>
              </div>
              <button
                onClick={() => setActiveTest(null)}
                className="w-full py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors border border-slate-300/40"
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
