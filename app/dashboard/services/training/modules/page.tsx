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
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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

const MODULES_DATA = [
  {
    id: "m1",
    step: "M1",
    title: "Introduction to Bioinformatics",
    duration: "3h",
  },
  {
    id: "m2",
    step: "M2",
    title: "Sequence Quality Control",
    duration: "2h",
  },
  {
    id: "m3",
    step: "M3",
    title: "Alignment & Mapping",
    duration: "4h",
  },
  {
    id: "m4",
    step: "M4",
    title: "Variant Calling Fundamentals",
    duration: "4h",
  },
  {
    id: "m5",
    step: "M5",
    title: "Transcriptomics & RNA-Seq",
    duration: "5h",
  },
  {
    id: "m6",
    step: "M6",
    title: "Metagenomics & Amplicon Analysis",
    duration: "4h",
  },
];

export default function ModulesPage() {
  const activeServiceTab = "training";
  const activeWorkspaceTab = "modules";

  // State to track row selection or interactive toggle active states
  const [activeModuleId, setActiveModuleId] = useState<string | null>("m1");

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
        {SERVICES_CONFIG.map((service) => {
          const isActive = activeServiceTab === service.id;
          return (
            <Link
              key={service.id}
              href={service.href}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 ${
                isActive
                  ? "bg-[#2a7797] text-white border-[#2a7797] shadow-sm"
                  : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50 hover:text-slate-800"
              }`}
            >
              {service.title}
            </Link>
          );
        })}
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

      {/* Main Training Modules Frame Panel Box */}
      <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
        {/* Header Action Row with Circle Metric Status graph widget */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-4">
            {/* SVG Progress Circle Graph Indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#4ec2bb]"
                  strokeDasharray="33, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-extrabold text-slate-700 font-quicksand">
                33%
              </span>
            </div>

            <div className="space-y-0.5">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Training Modules
              </h2>
              <p className="text-xs font-bold text-slate-700">
                2 of 6 modules completed{" "}
                <span className="text-slate-400 font-medium block md:inline md:ml-1">
                  • Progress synced to your profile
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="text-[10px] font-bold tracking-wider text-[#359b95] bg-[#e6f7f6] px-4 py-2 rounded-full uppercase transition-colors hover:bg-[#d5f2f0]"
          >
            Save Progress
          </button>
        </div>

        {/* Full Width Step Stack Container Canvas */}
        <div className="space-y-3">
          {MODULES_DATA.map((module, index) => {
            const isActive = activeModuleId === module.id;
            const isCompleted = index < 2; // M1 & M2 set completed reference mock states

            return (
              <div
                key={module.id}
                onClick={() => setActiveModuleId(isActive ? null : module.id)}
                className={`w-full rounded-[20px] p-5 border transition-all duration-300 bg-white flex items-center justify-between cursor-pointer ${
                  isActive || isCompleted
                    ? "border-[#4ec2bb]/40 bg-[#f7fdfc]"
                    : "border-slate-200/90 shadow-sm hover:border-slate-300"
                }`}
              >
                {/* Left Metadata elements group panel */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 tracking-wide transition-colors ${
                      isActive || isCompleted
                        ? "bg-[#4ec2bb] text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {module.step}
                  </div>

                  <div className="space-y-0.5 text-left">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                      {module.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Duration: {module.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Trigger Buttons Layout Group */}
                <div className="flex items-center gap-4">
                  {isCompleted && (
                    <CheckCircle2 className="w-[18px] h-[18px] text-[#4ec2bb] shrink-0" />
                  )}

                  <button
                    type="button"
                    className={`text-[11px] font-bold px-4 py-2 rounded-xl transition-all border ${
                      isActive
                        ? "bg-[#4ec2bb] text-white border-[#4ec2bb]"
                        : "bg-[#eaf7f6] text-[#247974] border-[#4ec2bb]/20 hover:bg-[#deefed]"
                    }`}
                  >
                    Open
                  </button>

                  <div className="text-slate-400 shrink-0">
                    {isActive ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
