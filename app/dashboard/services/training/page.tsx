"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Clock,
  User,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/* ================= CONFIGURATION & INITIAL MOCK SETUP ================= */
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

interface Participant {
  id: string;
  name: string;
  email: string;
  institution: string;
  pre_test_score: number;
  post_test_score: number;
  has_certificate: boolean;
}

interface TrainingProgram {
  id: string;
  title: string;
  type: string;
  start_date: string;
  end_date: string;
  duration: string;
  description: string;
  instructor: { name: string };
  participants: Participant[];
}

const MOCK_TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: "tp-1",
    title: "Advanced Bioinformatics Sequencing & GATK Architecture",
    type: "training",
    start_date: "2026-08-01",
    end_date: "2026-09-15",
    duration: "6 weeks",
    description:
      "Deep dive validation on high-throughput next generation raw read alignment, variant calling protocols, and pipeline optimization utilizing cluster resources.",
    instructor: { name: "Dr. Elena Rostova" },
    participants: [
      {
        id: "p-1",
        name: "Dr. Alex Mercer",
        email: "a.mercer@mit.edu",
        institution: "MIT Broad Institute",
        pre_test_score: 72,
        post_test_score: 94,
        has_certificate: true,
      },
      {
        id: "p-2",
        name: "Sarah Chen",
        email: "schen@stanford.edu",
        institution: "Stanford Medicine",
        pre_test_score: 68,
        post_test_score: 98,
        has_certificate: true,
      },
      {
        id: "p-3",
        name: "Michael Abad",
        email: "msabad@up.edu.ph",
        institution: "UP Manila",
        pre_test_score: 55,
        post_test_score: 82,
        has_certificate: false,
      },
    ],
  },
  {
    id: "tp-2",
    title: "16S Metagenomics Analysis Framework",
    type: "training",
    start_date: "2026-10-10",
    end_date: "2026-11-20",
    duration: "5 weeks",
    description:
      "Curriculum centered on microbial community analysis using QIIME2 pipelines, taxonomic allocation, and alpha/beta diversity quantification metrics.",
    instructor: { name: "Prof. Marcus Vance" },
    participants: [
      {
        id: "p-4",
        name: "Dr. Elena Rostova",
        email: "e.rostova@lab.org",
        institution: "BioBiome Labs",
        pre_test_score: 88,
        post_test_score: 100,
        has_certificate: true,
      },
    ],
  },
];

export default function TrainingProgramsPage() {
  const activeServiceTab = "training";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPrograms = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return MOCK_TRAINING_PROGRAMS;

    return MOCK_TRAINING_PROGRAMS.filter(
      (prog) =>
        prog.title.toLowerCase().includes(query) ||
        prog.description.toLowerCase().includes(query) ||
        prog.instructor.name.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 mx-auto font-aileron w-full max-w-[1240px] px-4 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
            Dashboard - Client Services
          </span>
          <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
            Bioinformatics Services
          </h1>
        </div>
      </div>

      {/* Service Selection Capsules */}
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

      {/* Top filter utility block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#fffdf8] border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-800">
            Cohorts Directory
          </h3>
          <p className="text-xs text-slate-400">
            Select a training program sequence to manage documents, syllabus and
            grading records.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs or trainers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Programs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPrograms.map((prog) => (
          <div
            key={prog.id}
            className="flex flex-col justify-between bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-200 relative group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9px] font-bold text-[#f57f17] uppercase tracking-[1.5px] font-quicksand bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-2.5 h-2.5" /> Track Cohort
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Users className="w-3.5 h-3.5 text-slate-300" />
                  <span>{prog.participants.length} Active Enrolled</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-[#2a7797] transition-colors">
                  {prog.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {prog.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Instructor:{" "}
                    <strong className="text-slate-700">
                      {prog.instructor.name}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Duration:{" "}
                    <strong className="text-slate-700">{prog.duration}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Timeline:{" "}
                    <strong className="text-slate-700">
                      {prog.start_date} to {prog.end_date}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/dashboard/services/training/${prog.id}`}
                className="flex items-center justify-center gap-1.5 w-full h-10 bg-[#eaf7f6] hover:bg-[#4ec2bb] text-[#247974] hover:text-white text-xs font-bold rounded-xl transition-all border border-[#4ec2bb]/25"
              >
                <span>See Details & Participants</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}

        {filteredPrograms.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white border border-slate-200 rounded-[24px]">
            <p className="text-sm text-slate-400 font-medium">
              No training programs match your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
