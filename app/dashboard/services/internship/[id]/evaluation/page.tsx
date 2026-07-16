"use client";

import React, { useState } from "react";
import { BarChart3, Star, Send, CheckCircle } from "lucide-react";

/* ================= TYPES & CONFIG ================= */
interface EvaluationQuestion {
  id: string;
  label: string;
  type: "rating" | "text";
}

const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  {
    id: "eq1",
    label:
      "How would you rate the depth of hands-on technical guidance and production workflow coverage?",
    type: "rating",
  },
  {
    id: "eq2",
    label:
      "Rate the availability, responsiveness, and professional mentorship of your supervising mentor.",
    type: "rating",
  },
  {
    id: "eq3",
    label:
      "What components of the internship tasks, environment access, or pipeline deployments could be optimized?",
    type: "text",
  },
];

const INTERNSHIP_TRACKS = [
  "Clinical Bioinformatics & Transcriptomics Internship",
  "Software Engineering & Cloud Pipelines Internship",
  "AI & Machine Learning Research Internship",
  "Product Management & Digital Health Internship",
];

interface EvaluationFormProps {
  onEvaluationSubmitted: (record: {
    name: string;
    programTitle: string;
  }) => void;
  onViewRegistry: () => void;
}

export default function InternshipEvaluationForm({
  onEvaluationSubmitted,
  onViewRegistry,
}: EvaluationFormProps) {
  const [participantName, setParticipantName] = useState("Marcus Vance");
  const [selectedProgram, setSelectedProgram] = useState(INTERNSHIP_TRACKS[0]);
  const [formValues, setFormValues] = useState<Record<string, any>>({
    eq1: 5,
    eq2: 5,
    eq3: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    // Pass the participant details up to the parent layer to generate a certificate row
    onEvaluationSubmitted({
      name: participantName,
      programTitle: selectedProgram,
    });
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setFormValues({ eq1: 5, eq2: 5, eq3: "" });
  };

  return (
    <div className="space-y-6 w-full bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
      <div className="border-b border-slate-200/60 pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#2a7797]" />
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Internship Performance & Placement Survey
          </h2>
        </div>
      </div>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">
                Intern Full Name
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#4ec2bb] focus:ring-4 focus:ring-[#4ec2bb]/10 p-3 text-slate-700 bg-white placeholder-slate-300 shadow-inner-sm transition-all duration-200"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">
                Internship Track Placement
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#4ec2bb] focus:ring-4 focus:ring-[#4ec2bb]/10 p-3 text-slate-700 bg-white shadow-inner-sm cursor-pointer transition-all duration-200"
              >
                {INTERNSHIP_TRACKS.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Questions Stack */}
          <div className="space-y-4">
            {EVALUATION_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="bg-[#f2f2f2] border border-slate-300/40 p-5 rounded-[20px] space-y-3 transition-all duration-200"
              >
                <label className="text-xs font-extrabold text-slate-700 block leading-snug">
                  {q.label}
                </label>

                {q.type === "rating" ? (
                  <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-xl border border-slate-200/40 inline-flex">
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
                        className="focus:outline-none transition-transform hover:scale-115 active:scale-90"
                      >
                        <Star
                          className={`w-6 h-6 transition-all duration-150 ${
                            starValue <= formValues[q.id]
                              ? "fill-[#f57f17] text-[#f57f17] drop-shadow-[0_1px_3px_rgba(245,127,23,0.15)]"
                              : "text-slate-300 hover:text-slate-400"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={formValues[q.id]}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        [q.id]: e.target.value,
                      })
                    }
                    placeholder="Provide structural and mentorship improvements here..."
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#4ec2bb] focus:ring-4 focus:ring-[#4ec2bb]/10 p-3 text-slate-600 bg-white placeholder-slate-400 shadow-inner-sm transition-all duration-200 resize-none"
                    required
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#2a7797] text-white font-bold text-xs rounded-xl hover:bg-[#1f5a73] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-slate-300/20"
          >
            <Send className="w-3.5 h-3.5" /> Submit Metrics & Generate
            Internship Certificate
          </button>
        </form>
      ) : (
        /* Submission Success Screen */
        <div className="bg-[#f2f2f2] border border-slate-300/60 rounded-[24px] p-8 text-center space-y-4 max-w-md mx-auto">
          <CheckCircle className="w-12 h-12 text-[#4ec2bb] mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-sans">
              Evaluation Logged!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your evaluation performance record has been submitted. A formal
              internship certificate has been created.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onViewRegistry}
              className="w-full py-2 bg-[#4ec2bb] text-white font-bold text-xs rounded-xl hover:bg-[#3db0a9] transition-colors shadow-sm"
            >
              Go View Certificate Registry
            </button>
            <button
              onClick={handleResetForm}
              className="w-full py-2 bg-white text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              Submit New Evaluation Track
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
