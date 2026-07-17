"use client";

import React, { useState, use } from "react";
import { CheckCircle2, Check } from "lucide-react";

interface ModuleItem {
  id: string;
  step: string;
  title: string;
}

const MODULES_DATA: ModuleItem[] = [
  { id: "m1", step: "M1", title: "Introduction to Bioinformatics" },
  { id: "m2", step: "M2", title: "Sequence Quality Control" },
  { id: "m3", step: "M3", title: "Alignment & Mapping" },
  { id: "m4", step: "M4", title: "Variant Calling Fundamentals" },
  { id: "m5", step: "M5", title: "Transcriptomics & RNA-Seq" },
  { id: "m6", step: "M6", title: "Metagenomics & Amplicon Analysis" },
];

export default function TrainingModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Safe runtime resolution of the dynamic structural path parameter
  const resolvedParams = use(params);

  // Manage module read state locally matching the portfolio pipeline layout rules
  const [readModuleIds, setReadModuleIds] = useState<string[]>([]);

  const toggleMarkAsRead = (moduleId: string) => {
    setReadModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  return (
    <div className="bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
            Training Modules Progression
          </h3>
          <p className="text-xs font-semibold text-slate-500">
            {readModuleIds.length} of {MODULES_DATA.length} modules completed •
            Progress synced to cohort standard
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-[#359b95] bg-[#e6f7f6] px-4 py-1.5 rounded-full uppercase self-start sm:self-center">
          Module ID: {resolvedParams.id}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {MODULES_DATA.map((module) => {
          const isRead = readModuleIds.includes(module.id);

          return (
            <div
              key={module.id}
              className={`w-full rounded-[20px] p-4 border transition-all duration-300 flex items-center justify-between cursor-default shadow-sm ${
                isRead
                  ? "border-[#4ec2bb]/60 bg-[#f0faf9]"
                  : "border-slate-200 bg-[#FAF9F5]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-colors ${
                    isRead
                      ? "bg-[#4ec2bb] text-white"
                      : "bg-white border border-slate-200 text-slate-400"
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
                {isRead && (
                  <CheckCircle2 className="w-[18px] h-[18px] text-[#4ec2bb]" />
                )}

                {/* Mark as Read Toggle Mechanism */}
                <button
                  onClick={() => toggleMarkAsRead(module.id)}
                  className={`flex items-center gap-1.5 text-[11px] font-extrabold px-4 py-2 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    isRead
                      ? "bg-white hover:bg-amber-50 border-[#4ec2bb]/40 text-[#247974] hover:text-amber-600 hover:border-amber-300"
                      : "bg-white hover:bg-[#4ec2bb] border-slate-200 hover:border-[#4ec2bb] text-slate-700 hover:text-white"
                  }`}
                >
                  {isRead ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </>
                  ) : (
                    "Mark as Read"
                  )}
                </button>

                {/* Secondary Course Content Trigger Button */}
                <button
                  onClick={() =>
                    console.log(`View training materials for ${module.title}`)
                  }
                  className="text-[11px] font-extrabold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-[#4ec2bb] hover:border-[#4ec2bb] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  View Materials
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
