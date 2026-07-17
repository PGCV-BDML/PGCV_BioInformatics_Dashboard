"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { DashboardBreadcrumbs } from "../../../components/dashboardbreadcrumbs"; // Adjusted import path to match your project setup
import { Search, Calendar, Clock, User, Users, ArrowRight } from "lucide-react";
import { getRowsFromDB, getUsersFromDB } from "../../../../lib/supabase";

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

interface Intern {
  id: string;
  name: string;
  email: string;
  institution: string;
  midterm_score: number;
  final_score: number;
  has_certificate: boolean;
}

interface InternshipProgram {
  id: string;
  title: string;
  type: string;
  start_date: string;
  end_date: string;
  duration?: string;
  description: string;
  mentor: { name: string };
  // ponytail: interns count not available from internship_program table — shows 0
  interns?: Intern[];
}

export default function InternshipProgramsPage() {
  const activeServiceTab = "internship";
  const [searchQuery, setSearchQuery] = useState("");
  const [programsList, setProgramsList] = useState<InternshipProgram[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [programs, users] = await Promise.all([
          getRowsFromDB("training_program"),
          getUsersFromDB(["team_lead", "team_member"]),
        ]);
        const userMap = new Map<string, string>();
        for (const u of users as any[]) userMap.set(u.id, u.name);
        const filtered = (programs as any[]).filter((p) => p.type === "internship");
        const rows: InternshipProgram[] = filtered.map((p) => ({
          ...p,
          mentor: { name: userMap.get(p.instructor_id) ?? "—" },
        }));
        setProgramsList(rows);
      } catch (err) {
        console.error("Error loading programs:", err);
      }
    };
    loadData();
  }, []);

  const filteredPrograms = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return programsList;

    return programsList.filter(
      (prog) =>
        prog.title.toLowerCase().includes(query) ||
        prog.description.toLowerCase().includes(query) ||
        prog.mentor.name.toLowerCase().includes(query),
    );
  }, [searchQuery, programsList]);

  const breadcrumbTrail = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Bioinformatics Services", href: "/dashboard/services" },
    { label: "3.3 Internship" },
  ];

  return (
    <div className="space-y-8 mx-auto font-aileron w-full max-w-[1240px]">
      {/* Top Header Controls Layout */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-300/40 pb-5">
        <div className="flex flex-col gap-1">
          {/* Breadcrumbs Component trail mapping */}
          <div className="opacity-95 text-xs tracking-wide transition-colors">
            <DashboardBreadcrumbs items={breadcrumbTrail} />
          </div>

          {/* Standardized Title Typography — Fixed to Bioinformation Services */}
          <h1 className="text-4xl md:text-[42px] font-extrabold text-[#2a7797] tracking-tight font-aileron mt-2 leading-tight">
            Bioinformatics Services
          </h1>

          {/* Core Subheader layout line */}
          <p className="text-xs md:text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
            Operational workflows · Review active sequences, configurations, and
            analytical reporting metrics
          </p>
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
                  ? "bg-[#2a7797] text-white border-[#2a7797] shadow-md shadow-[#2a7797]/20 font-bold"
                  : "bg-[#fffdf8] text-slate-600 border-slate-300/60 shadow-md shadow-slate-400/10 hover:bg-slate-50/50 hover:text-slate-800"
              }`}
            >
              {service.title}
            </Link>
          );
        })}
      </div>

      {/* Primary Card Wrapper containing Header & Cohort Directory details */}
      <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold text-slate-800">
              Cohorts Directory
            </h2>
            <p className="text-xs text-slate-400">
              Select an internship program sequence to manage documents,
              syllabus and grading records.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programs or mentors..."
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
                    Internship
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-300" />
                    <span>{prog.interns?.length ?? 0} Active Interns</span>
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
                      Mentor:{" "}
                      <strong className="text-slate-700 font-bold">
                        {prog.mentor.name}
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
                  href={`/dashboard/services/internship/${prog.id}`}
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
                No internship programs match your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
