"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  User,
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Award,
  FileText,
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
  { id: "programs", label: "Internship Programs", icon: GraduationCap },
  { id: "modules", label: "Modules", icon: BookOpen },
  { id: "tests", label: "Pre/Post Tests", icon: ClipboardCheck },
  { id: "evaluation", label: "Evaluation", icon: BarChart3 },
  { id: "certificate", label: "Certificate", icon: Award },
  { id: "docs", label: "Docs & Forms", icon: FileText },
];

const MOCK_INTERNSHIP_PROGRAMS = [
  {
    id: "int-1",
    title: "Clinical Genomics Research Internship (Cohort Delta)",
    type: "internship",
    start_date: "2026-07-01",
    end_date: "2026-12-31",
    duration: "6 months",
    description:
      "Hands-on immersion in a clinical diagnostic workspace. Interns handle variant validation, processing pipelines, and raw DNA cleanroom protocols.",
    instructor: { name: "Dr. Sarah Jenkins" },
  },
  {
    id: "int-2",
    title: "Metagenomics Environmental Lab Internship",
    type: "internship",
    start_date: "2026-09-01",
    end_date: "2026-11-30",
    duration: "3 months",
    description:
      "Practical environmental sample processing, mapping biological contamination matrices, and analyzing microbial diversity in soil samples.",
    instructor: { name: "Dr. Liam Patel" },
  },
];

export default function InternshipPage() {
  const activeServiceTab = "internship";
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("programs");

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
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWorkspaceTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-[18px] text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#4ec2bb] text-white shadow-md shadow-[#4ec2bb]/10"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Render Box */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/20 space-y-6">
        {activeWorkspaceTab === "programs" ? (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <GraduationCap className="w-6 h-6 text-[#f57f17]" />
              <h2 className="text-2xl font-bold text-[#333333]">
                Internship Registry
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_INTERNSHIP_PROGRAMS.map((program) => (
                <div
                  key={program.id}
                  className="group relative bg-white border border-slate-200 hover:border-[#4ec2bb] rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4ec2bb] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#f57f17] uppercase tracking-[1.5px] font-quicksand">
                        <Sparkles className="w-3 h-3" />{" "}
                        {program.type.toUpperCase()} TRACK
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-snug group-hover:text-[#2a7797] transition-colors">
                        {program.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                      {program.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {program.instructor.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{program.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {program.start_date} — {program.end_date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-auto">
                    <Link
                      href={`/dashboard/services/internship/${program.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#2a7797] hover:bg-[#205d77] px-4 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      Go to Workspace <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-sm text-slate-400 font-medium italic">
            No items mapped to the workspace view. Select a running tracking
            card first.
          </div>
        )}
      </div>
    </div>
  );
}
