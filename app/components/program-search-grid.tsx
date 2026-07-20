"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Calendar, Clock, User, Users, ArrowRight } from "lucide-react";

export interface ProgramCard {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  start_date: string;
  end_date: string;
  duration: string;
  participant_count: number;
}

interface ProgramSearchGridProps {
  programs: ProgramCard[];
  type: "training" | "internship";
}

export default function ProgramSearchGrid({
  programs,
  type,
}: ProgramSearchGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs;
    const q = searchQuery.toLowerCase();
    return programs.filter(
      (prog) =>
        prog.title.toLowerCase().includes(q) ||
        prog.description.toLowerCase().includes(q) ||
        prog.instructor_name.toLowerCase().includes(q)
    );
  }, [programs, searchQuery]);

  const isTraining = type === "training";
  const typeLabel = isTraining ? "Training" : "Internship";
  const roleLabel = isTraining ? "Instructor:" : "Mentor:";
  const participantLabel = isTraining ? "Active Enrolled" : "Active Interns";
  const subtitle = isTraining
    ? "Select a training program sequence to manage documents, syllabus and grading records."
    : "Select an internship program sequence to manage documents, syllabus and grading records.";
  const searchPlaceholder = isTraining
    ? "Search programs or trainers..."
    : "Search programs or mentors...";
  const emptyMessage = isTraining
    ? "No training programs match your search criteria."
    : "No internship programs match your search criteria.";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold text-slate-800">
            Cohorts Directory
          </h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30 transition-all shadow-sm"
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
                  {typeLabel}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Users className="w-3.5 h-3.5 text-slate-300" />
                  <span>
                    {prog.participant_count} {participantLabel}
                  </span>
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
                    {roleLabel}{" "}
                    <strong className="text-slate-700 font-bold">
                      {prog.instructor_name}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Duration:{" "}
                    <strong className="text-slate-700 font-bold">
                      {prog.duration}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Timeline:{" "}
                    <strong className="text-slate-700 font-bold">
                      {prog.start_date} to {prog.end_date}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/dashboard/services/${type}/${prog.id}`}
                className="flex items-center justify-center gap-1.5 w-full h-10 bg-[#f0fdfa] border border-[#ccfbf1] text-[#115e59] hover:bg-[#14b8a6] hover:border-[#14b8a6] hover:text-white text-xs font-bold rounded-xl shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <span>See Details</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}

        {filteredPrograms.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white border border-slate-200 rounded-[24px]">
            <p className="text-sm text-slate-400 font-medium">
              {emptyMessage}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
