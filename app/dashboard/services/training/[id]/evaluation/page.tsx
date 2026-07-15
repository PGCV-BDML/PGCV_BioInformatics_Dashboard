"use client";

import React, { useState, use } from "react";
import {
  BarChart3,
  Award,
  Star,
  Send,
  CheckCircle,
  Printer,
  Trash2,
  ExternalLink,
  X,
  FileBadge,
} from "lucide-react";

/* ================= TYPES & CONFIG ================= */
interface EvaluationQuestion {
  id: string;
  label: string;
  type: "rating" | "text";
}

interface CertificateRecord {
  id: string;
  name: string;
  programTitle: string;
  date: string;
}

const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  {
    id: "eq1",
    label:
      "How would you rate the depth of content and bioinformatics pipeline coverage?",
    type: "rating",
  },
  {
    id: "eq2",
    label:
      "Rate the speed, responsiveness, and approachability of the course instructor.",
    type: "rating",
  },
  {
    id: "eq3",
    label:
      "What parts of the workflow curriculum or software tracking exercises could be optimized?",
    type: "text",
  },
];

export default function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Resolve parameters to ensure alignment with active dynamic route structures
  const resolvedParams = use(params);

  // Local state to toggle between Evaluation view and Certificates tab inside the workspace container
  const [currentSubTab, setCurrentSubTab] = useState<
    "evaluation" | "certificate"
  >("evaluation");

  // Form Inputs State
  const [participantName, setParticipantName] = useState("Alex Mercer, Ph.D.");
  const [selectedProgram, setSelectedProgram] = useState(
    "Advanced Bioinformatics Sequencing & GATK Architecture",
  );
  const [formValues, setFormValues] = useState<Record<string, any>>({
    eq1: 5,
    eq2: 5,
    eq3: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Simulated Certificate Registry DB Rows
  const [certificates, setCertificates] = useState<CertificateRecord[]>([
    {
      id: "CERT-DF83KS9A",
      name: "Dr. Elena Rostova",
      programTitle: "16S Metagenomics Analysis Framework",
      date: "2026-06-12",
    },
  ]);

  // Selected item for the full-screen printable overlay
  const [viewingCertificate, setViewingCertificate] =
    useState<CertificateRecord | null>(null);

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    const newCertId =
      "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const newRecord: CertificateRecord = {
      id: newCertId,
      name: participantName,
      programTitle: selectedProgram,
      date: new Date().toISOString().split("T")[0],
    };

    setCertificates((prev) => [newRecord, ...prev]);
    setViewingCertificate(newRecord);
  };

  const handleDeleteCertificate = (id: string) => {
    setCertificates((prev) => prev.filter((cert) => cert.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Sub-tab Selector inside the Workspace */}
      <div className="print:hidden flex items-center gap-2 border-b border-slate-100 pb-3">
        <button
          onClick={() => setCurrentSubTab("evaluation")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            currentSubTab === "evaluation"
              ? "bg-[#2a7797]/10 text-[#2a7797]"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          1. Submit Evaluation
        </button>
        <button
          onClick={() => setCurrentSubTab("certificate")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            currentSubTab === "certificate"
              ? "bg-[#2a7797]/10 text-[#2a7797]"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          2. Certificate Registry ({certificates.length})
        </button>
      </div>

      {/* Main Workspace Card Area */}
      <div className="print:hidden bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        {currentSubTab === "evaluation" ? (
          /* ================= EVALUATION VIEW ================= */
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
                      Training Track Track
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

                <div className="space-y-3 pt-2">
                  {EVALUATION_QUESTIONS.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white border border-slate-200/80 p-4 rounded-[16px] space-y-2"
                    >
                      <label className="text-xs font-bold text-slate-700 block leading-snug">
                        {q.label}
                      </label>
                      {q.type === "rating" ? (
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((starValue) => (
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
                                  starValue <= formValues[q.id]
                                    ? "fill-[#f57f17] text-[#f57f17]"
                                    : "text-slate-200"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          rows={2}
                          value={formValues[q.id]}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              [q.id]: e.target.value,
                            })
                          }
                          placeholder="Provide pipeline workflow optimizations here..."
                          className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-2 text-slate-600 bg-slate-50/50"
                          required
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#2a7797] text-white font-bold text-xs rounded-xl hover:bg-[#1f5a73] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Metrics & Generate
                  Award Certificate
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
                    Your response was logged. A certificate has been inserted
                    into your records workspace registry.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setCurrentSubTab("certificate")}
                    className="w-full py-2 bg-[#4ec2bb] text-white font-bold text-xs rounded-xl hover:bg-[#3db0a9] transition-colors shadow-sm"
                  >
                    Go View Certificates Table
                  </button>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormValues({ eq1: 5, eq2: 5, eq3: "" });
                    }}
                    className="w-full py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Submit New Evaluation Track
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= CERTIFICATES TAB LOG MATRIX ================= */
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#f57f17]" />
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Certificates Database Log Registry
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Certificate ID</th>
                    <th className="p-4">Participant Name</th>
                    <th className="p-4">Program Track Title</th>
                    <th className="p-4">Verification Date</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {certificates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-400 font-medium italic"
                      >
                        No verification rows found inside table schema
                        parameters.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => (
                      <tr
                        key={cert.id}
                        className="hover:bg-slate-50/40 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-[#2a7797] text-[11px] whitespace-nowrap">
                          {cert.id}
                        </td>
                        <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                          {cert.name}
                        </td>
                        <td className="p-4 font-medium max-w-[260px] truncate">
                          {cert.programTitle}
                        </td>
                        <td className="p-4 text-slate-500 font-semibold font-mono whitespace-nowrap">
                          {cert.date}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingCertificate(cert)}
                              className="px-3 py-1.5 bg-[#eaf7f6] hover:bg-[#deefed] text-[#247974] font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                              title="View & Print Certificate HTML Layout"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Certificate</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCertificate(cert.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Row Log Entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* HTML Printable Certificate Overlay Modal Layer */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[840px] p-6 space-y-4 relative print:rounded-none print:shadow-none print:p-0">
            <div className="print:hidden flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-[#2a7797]" />
                <span className="text-xs font-bold text-slate-700 font-mono tracking-wide">
                  {viewingCertificate.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#4ec2bb] text-white hover:bg-[#3db0a9] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setViewingCertificate(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Certificate Layout */}
            <div className="w-full border border-slate-300 rounded-lg bg-white aspect-[1.414/1] flex flex-col p-8 sm:p-12 relative print:border-none print:m-0 print:p-6 print:w-full">
              <div className="absolute inset-4 border-[3px] border-[#2a7797]/60 rounded-[4px] pointer-events-none" />
              <div className="absolute inset-5 border border-[#2a7797]/20 rounded-[2px] pointer-events-none" />

              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#2a7797]/80 rounded-tl" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#2a7797]/80 rounded-tr" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#2a7797]/80 rounded-bl" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#2a7797]/80 rounded-br" />

              <div className="text-center space-y-4 my-auto">
                <div className="flex justify-center">
                  <Award className="w-10 h-10 text-[#2a7797] opacity-80" />
                </div>

                <div className="space-y-1">
                  <span className="font-quicksand text-[10px] font-extrabold uppercase tracking-[3px] text-[#7a8e9b]">
                    Certificate of Completion
                  </span>
                  <p className="text-[9px] italic text-slate-400 font-serif">
                    this is proudly awarded to
                  </p>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-semibold tracking-wide text-slate-800 border-b border-slate-100 max-w-md mx-auto pb-1 uppercase">
                  {viewingCertificate.name}
                </h2>

                <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  for successfully validating all advanced computation
                  parameters, pipelines architectures, and quality controls
                  under the specialized tracking course curriculum of
                </p>

                <h3 className="text-sm sm:text-base font-bold text-[#2a7797] max-w-xl mx-auto tracking-tight">
                  {viewingCertificate.programTitle}
                </h3>
              </div>

              <div className="mt-auto grid grid-cols-3 items-end gap-6 pt-4">
                <div className="text-left">
                  <div className="border-b border-slate-300 pb-0.5">
                    <p className="font-serif italic text-xs text-slate-800">
                      Elena Rostova
                    </p>
                  </div>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                    Lead Academic Coordinator
                  </span>
                </div>

                <div className="text-center flex justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-[#f57f17]/20 bg-amber-50/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#f57f17]" />
                  </div>
                </div>

                <div className="text-right">
                  <div className="border-b border-slate-300 pb-0.5">
                    <span className="font-mono text-[10px] font-bold text-slate-700">
                      {viewingCertificate.date}
                    </span>
                  </div>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                    Verification Date
                  </span>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[7px] font-mono text-slate-400">
                System Verification Key:{" "}
                <span className="font-bold text-slate-500">
                  {viewingCertificate.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX layout parser mapping to cleanly strip general layouts on print execution triggers */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed,
          .fixed * {
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .aspect-\\[1\\.414\\/1\\] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            border: none !important;
            margin: 0 !important;
            padding: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
