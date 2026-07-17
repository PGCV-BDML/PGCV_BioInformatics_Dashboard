"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";

const MODULES_DATA = [
  {
    id: "m1",
    step: "M1",
    title: "Introduction to Bioinformatics",
    duration: "3h",
  },
  { id: "m2", step: "M2", title: "Sequence Quality Control", duration: "2h" },
  { id: "m3", step: "M3", title: "Alignment & Mapping", duration: "4h" },
  {
    id: "m4",
    step: "M4",
    title: "Variant Calling Fundamentals",
    duration: "4h",
  },
  { id: "m5", step: "M5", title: "Transcriptomics & RNA-Seq", duration: "5h" },
  {
    id: "m6",
    step: "M6",
    title: "Metagenomics & Amplicon Analysis",
    duration: "4h",
  },
];

export default function ModulesTab() {
  const [activeModuleId, setActiveModuleId] = useState<string | null>("m1");

  return (
    <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
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
          <div>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
              Training Modules Progression
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              2 of 6 modules completed • Progress synced to cohort standard
            </p>
          </div>
        </div>
        <button className="text-[10px] font-bold tracking-wider text-[#359b95] bg-[#e6f7f6] px-4 py-2.5 rounded-full uppercase transition-colors hover:bg-[#d5f2f0]">
          Save Progress
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {MODULES_DATA.map((module, index) => {
          const isActive = activeModuleId === module.id;
          const isCompleted = index < 2;

          return (
            <div
              key={module.id}
              onClick={() => setActiveModuleId(isActive ? null : module.id)}
              className={`w-full rounded-[20px] p-4 border transition-all duration-300 bg-white flex items-center justify-between cursor-pointer ${
                isActive || isCompleted
                  ? "border-[#4ec2bb]/40 bg-[#f7fdfc]"
                  : "border-slate-200/90 shadow-sm hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-colors ${isActive || isCompleted ? "bg-[#4ec2bb] text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  {module.step}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                    {module.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Duration: {module.duration}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isCompleted && (
                  <CheckCircle2 className="w-[18px] h-[18px] text-[#4ec2bb]" />
                )}
                <button className="text-[11px] font-bold px-4 py-2 rounded-xl border bg-[#eaf7f6] text-[#247974] border-[#4ec2bb]/20">
                  View Materials
                </button>
                {isActive ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
