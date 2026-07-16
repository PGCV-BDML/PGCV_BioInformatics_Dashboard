"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";

const MODULES_DATA = [
  { id: "m1", step: "M1", title: "Introduction to Bioinformatics" },
  { id: "m2", step: "M2", title: "Sequence Quality Control" },
  { id: "m3", step: "M3", title: "Alignment & Mapping" },
  { id: "m4", step: "M4", title: "Variant Calling Fundamentals" },
  { id: "m5", step: "M5", title: "Transcriptomics & RNA-Seq" },
  { id: "m6", step: "M6", title: "Metagenomics & Amplicon Analysis" },
];

export default function ModulesTab() {
  const [activeModuleId, setActiveModuleId] = useState<string | null>("m1");

  return (
    <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
            Training Modules Progression
          </h3>
          <p className="text-xs font-semibold text-slate-500">
            2 of 6 modules completed • Progress synced to cohort standard
          </p>
        </div>
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-colors ${
                    isActive || isCompleted
                      ? "bg-[#4ec2bb] text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {module.step}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">
                    {module.title}
                  </h4>
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
