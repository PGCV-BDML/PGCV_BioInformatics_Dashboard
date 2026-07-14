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
  Star,
  Send,
  CheckCircle,
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

const EVALUATION_QUESTIONS = [
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

export default function EvaluationPage() {
  const activeServiceTab = "training";
  const activeWorkspaceTab = "evaluation";

  const [formValues, setFormValues] = useState<Record<string, any>>({
    eq1: 5,
    eq2: 5,
    eq3: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
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

      {/* Main Form Area */}
      <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        {!isSubmitted ? (
          <form
            onSubmit={handleSubmitEvaluation}
            className="space-y-6 max-w-2xl"
          >
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#f57f17]" />
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Course Evaluation Survey
                </h2>
              </div>
            </div>

            <div className="space-y-5">
              {EVALUATION_QUESTIONS.map((q) => (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200/80 p-5 rounded-[20px] space-y-3 shadow-sm"
                >
                  <label className="text-xs font-bold text-slate-700 block leading-snug">
                    {q.label}
                  </label>

                  {q.type === "rating" ? (
                    <div className="flex items-center gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((starValue) => (
                        <button
                          type="button"
                          key={starValue}
                          onClick={() =>
                            setFormValues({ ...formValues, [q.id]: starValue })
                          }
                          className="focus:outline-none transition-transform active:scale-95"
                        >
                          <Star
                            className={`w-6 h-6 ${
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
                      rows={3}
                      value={formValues[q.id]}
                      onChange={(e) =>
                        setFormValues({ ...formValues, [q.id]: e.target.value })
                      }
                      placeholder="Write your suggestions here..."
                      className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-3 text-slate-600 bg-[#fffdf8]/50"
                      required
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2a7797] text-white font-bold text-xs rounded-xl hover:bg-[#1f5a73] shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Submit Evaluation Data
            </button>
          </form>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-[24px] p-8 max-w-md mx-auto text-center space-y-4 shadow-sm my-8">
            <CheckCircle className="w-12 h-12 text-[#4ec2bb] mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">Thank You!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your qualitative metric submission answers have been safely
                captured into the analytics evaluation cluster stack.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="w-full py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
            >
              Update Submission
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
