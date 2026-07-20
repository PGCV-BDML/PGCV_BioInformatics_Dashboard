"use client";

import React, { useState, useEffect, use } from "react";
import { CheckCircle2, Check } from "lucide-react";
import { getRowsFromDB } from "@/lib/supabase";
import type { Module } from "@/types/database";

// DB module rows include a `step` column not captured in the Module type
type ModuleRow = Module & { step: string };

interface ModuleItem {
  id: string;
  step: string;
  title: string;
}

export default function InternshipModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  // Started with an empty array so no modules are pre-completed
  // ponytail: localStorage persistence — survives page navigation, not cross-device. Next cohort should add a `module_progress` table for server-side persistence.
  const [readModuleIds, setReadModuleIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`internship-modules-read-${resolvedParams.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setReadModuleIds(parsed.filter((x) => typeof x === "string"));
      }
    } catch {
      // ignore corrupted localStorage; fall back to empty state
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`internship-modules-read-${resolvedParams.id}`, JSON.stringify(readModuleIds));
    } catch {
      // localStorage may be full or disabled; ignore
    }
  }, [readModuleIds, resolvedParams.id]);
  const [modulesList, setModulesList] = useState<ModuleItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const modules = await getRowsFromDB<ModuleRow>("module");
        const filtered: ModuleItem[] = modules
          .filter((m) => m.program_id === resolvedParams.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((m) => ({ id: m.id, step: m.step, title: m.title ?? "" }));
        setModulesList(filtered);
      } catch (err) {
        console.error("Error loading modules:", err);
      }
    };
    load();
  }, [resolvedParams.id]);

  // Toggle module read status
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
            Internship Modules Progression
          </h3>
          <p className="text-xs font-semibold text-slate-500">
            {readModuleIds.length} of {modulesList.length} modules completed •
            Progress synced to cohort standard
          </p>
        </div>
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
                  : "border-slate-200 bg-[#FAF9F5]" // Exact warm gray hex color applied here
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

                {/* Mark as Read Button */}
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

                {/* View Materials Button */}
                <button
                  onClick={() =>
                    console.log(`View materials for ${module.title}`)
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
