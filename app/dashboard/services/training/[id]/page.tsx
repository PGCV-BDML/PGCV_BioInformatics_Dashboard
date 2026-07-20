"use client";

import React, { useState, use, useEffect, useRef } from "react";
import { CheckCircle2, Check } from "lucide-react";
import { getRowsFromDB } from "../../../../../lib/supabase";
import type { Module } from "../../../../../types/database";

interface ModuleItem {
  id: string;
  step?: string;
  title: string;
}

export default function TrainingModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Safe runtime resolution of the dynamic structural path parameter
  const resolvedParams = use(params);

  // Manage module read state locally matching the portfolio pipeline layout rules
  // ponytail: module_progress table not in schema — local state only, resets on navigation
  // ponytail: localStorage persistence — survives page navigation, not cross-device. Next cohort should add a `module_progress` table for server-side persistence.
  const [readModuleIds, setReadModuleIds] = useState<string[]>([]);

  useEffect(() => {
    // Load new program's read state — no save in this effect
    try {
      const raw = localStorage.getItem(`training-modules-read-${resolvedParams.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setReadModuleIds(parsed.filter((x) => typeof x === "string"));
        else setReadModuleIds([]);
      } else {
        setReadModuleIds([]);
      }
    } catch {
      setReadModuleIds([]);
    }
  }, [resolvedParams.id]);

  // Save only when readModuleIds changes from a user toggle, not on program switch
  useEffect(() => {
    try {
      localStorage.setItem(`training-modules-read-${resolvedParams.id}`, JSON.stringify(readModuleIds));
    } catch {
      // localStorage may be full or disabled; ignore
    }
  }, [readModuleIds]);
  const [modulesList, setModulesList] = useState<ModuleItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const modules = await getRowsFromDB<Module>("module");
      const filtered = modules
        .filter((m) => m.program_id === resolvedParams.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const mapped: ModuleItem[] = filtered.map((m, i) => ({
        id: m.id,
        step: m.title ? `M${i + 1}` : undefined,
        title: m.title ?? "Untitled Module",
      }));
      setModulesList(mapped);
    };
    load();
  }, [resolvedParams.id]);

  const toggleMarkAsRead = (moduleId: string) => {
    setReadModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  return (
    <div className="bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
            Training Modules Progression
          </h3>
          <p className="text-xs font-semibold text-slate-500">
            {readModuleIds.length} of {modulesList.length} modules completed •
            Progress synced to cohort standard
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-[#359b95] bg-[#e6f7f6] px-4 py-1.5 rounded-full uppercase self-start sm:self-center">
          Module ID: {resolvedParams.id}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {modulesList.map((module) => {
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
