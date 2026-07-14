"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Award,
  FileText,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AwardIcon,
  HelpCircle,
} from "lucide-react";

const SERVICES_CONFIG = [
  {
    id: "sequence-analysis",
    title: "3.1 — Client Sequence Analysis",
    href: "/dashboard/services",
  },
  {
    id: "training",
    title: "3.2 — Training",
    href: "/dashboard/services/training",
  },
  {
    id: "internship",
    title: "3.3 — Internship",
    href: "/dashboard/services/internship",
  },
];

const WORKSPACE_TABS = [
  {
    id: "programs",
    label: "Training Programs",
    icon: GraduationCap,
    href: "/dashboard/services/training",
  },
  {
    id: "modules",
    label: "Modules",
    icon: BookOpen,
    href: "/dashboard/services/training/modules",
  },
  {
    id: "tests",
    label: "Pre/Post Tests",
    icon: ClipboardCheck,
    href: "/dashboard/services/training/assessment", // <--- Must point to 'assessment'
  },
  {
    id: "evaluation",
    label: "Evaluation",
    icon: BarChart3,
    href: "/dashboard/services/training/evaluation", // <--- Must point to 'evaluation'
  },
  { id: "certificate", label: "Certificate", icon: Award, href: "#" },
  { id: "docs", label: "Docs & Forms", icon: FileText, href: "#" },
];

const MOCK_TESTS_DATA = [
  {
    id: "t1",
    title: "Introduction to Bioinformatics",
    preStatus: "completed",
    postStatus: "completed",
  },
  {
    id: "t2",
    title: "Sequence Quality Control",
    preStatus: "completed",
    postStatus: "pending",
  },
  {
    id: "t3",
    title: "Alignment & Mapping",
    preStatus: "none",
    postStatus: "none",
  },
  {
    id: "t4",
    title: "Variant Calling Fundamentals",
    preStatus: "none",
    postStatus: "none",
  },
  {
    id: "t5",
    title: "Transcriptomics & RNA-Seq",
    preStatus: "none",
    postStatus: "none",
  },
  {
    id: "t6",
    title: "Metagenomics & Amplicon Analysis",
    preStatus: "none",
    postStatus: "none",
  },
];

const MOCK_QUESTIONS = [
  {
    id: "q1",
    question:
      "Which file format is primarily used to store raw high-throughput sequencing reads along with quality scores?",
    options: ["FASTA", "FASTQ", "SAM", "VCF"],
    correct: 1,
  },
  {
    id: "q2",
    question:
      "What does a Phred quality score of 30 imply regarding base-calling error probability?",
    options: [
      "1 in 10 chance of error",
      "1 in 100 chance of error",
      "1 in 1000 chance of error",
      "1 in 10000 chance of error",
    ],
    correct: 2,
  },
];

export default function AssessmentPage() {
  const activeServiceTab = "training";
  const activeWorkspaceTab = "tests";

  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [testType, setTestType] = useState<"Pre-test" | "Post-test">(
    "Pre-test",
  );
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  const handleStartTest = (test: any, type: "Pre-test" | "Post-test") => {
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
    <div className="space-y-6 mx-auto font-aileron w-full max-w-[1240px] px-4 py-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Bioinformation Services
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            Bioinformatics Services
          </h1>
        </div>
      </div>

      {/* Persistent Top Service Capsule Row */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {SERVICES_CONFIG.map((service) => (
          <Link
            key={service.id}
            href={service.href}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 ${
              activeServiceTab === service.id
                ? "bg-[#2a7797] text-white border-[#2a7797]"
                : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {service.title}
          </Link>
        ))}
      </div>

      {/* Workspace Inner Navigation Bar */}
      <div className="bg-[#fffdf8] border border-slate-200 rounded-[24px] p-1.5 shadow-sm overflow-x-auto whitespace-nowrap flex items-center gap-1">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeWorkspaceTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[18px] text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#4ec2bb] text-white shadow-md shadow-[#4ec2bb]/10"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Container Area */}
      <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
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
                Assessments
              </span>
            </div>

            <div className="space-y-3">
              {MOCK_TESTS_DATA.map((test) => (
                <div
                  key={test.id}
                  className="w-full rounded-[20px] p-5 border border-slate-200/90 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                    {test.title}
                  </h3>

                  <div className="flex items-center gap-6 justify-between sm:justify-end shrink-0">
                    <div className="flex flex-col items-center gap-1 min-w-[55px]">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                        Pre-test
                      </span>
                      {test.preStatus === "completed" ? (
                        <CheckCircle2 className="w-[18px] h-[18px] text-[#4ec2bb]" />
                      ) : (
                        <div
                          onClick={() => handleStartTest(test, "Pre-test")}
                          className="w-[18px] h-[18px] rounded-full border-2 border-slate-200 cursor-pointer hover:border-[#4ec2bb]"
                        />
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 min-w-[55px]">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                        Post-test
                      </span>
                      {test.postStatus === "completed" ? (
                        <CheckCircle2 className="w-[18px] h-[18px] text-[#4ec2bb]" />
                      ) : test.postStatus === "pending" ? (
                        <Clock className="w-[18px] h-[18px] text-[#f57f17]" />
                      ) : (
                        <div
                          onClick={() => handleStartTest(test, "Post-test")}
                          className="w-[18px] h-[18px] rounded-full border-2 border-slate-200 cursor-pointer hover:border-[#4ec2bb]"
                        />
                      )}
                    </div>

                    {test.preStatus === "none" ? (
                      <button
                        onClick={() => handleStartTest(test, "Pre-test")}
                        className="text-[11px] font-bold px-4 py-2 bg-[#4ec2bb] text-white rounded-xl hover:bg-[#3db0a9] transition-all"
                      >
                        Start pre-test
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartTest(test, "Post-test")}
                        className="text-[11px] font-bold px-4 py-2 bg-[#eaf7f6] text-[#247974] border border-[#4ec2bb]/20 rounded-xl hover:bg-[#deefed] transition-all"
                      >
                        {test.postStatus === "completed"
                          ? "Review"
                          : "Start post-test"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                {testType} — {activeTest.title}
              </span>
            </div>

            {scoreResult === null ? (
              <div className="space-y-6 max-w-3xl">
                {MOCK_QUESTIONS.map((q, idx) => (
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
                ))}

                <button
                  onClick={calculateScore}
                  className="px-6 py-2.5 bg-[#2a7797] text-white font-bold text-xs rounded-xl hover:bg-[#1f5a73] shadow-sm transition-all"
                >
                  Submit Answers & Calculate Score
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-[24px] p-8 max-w-md mx-auto text-center space-y-4 shadow-sm">
                <AwardIcon className="w-12 h-12 text-[#f57f17] mx-auto" />
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
    </div>
  );
}
