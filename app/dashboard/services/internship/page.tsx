"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "../../../components/pageheader";
import { SERVICES_CONFIG } from "@/lib/services-config";
import { internshipBreadcrumbs } from "@/lib/breadcrumbs";
import ProgramSearchGrid, { type ProgramCard } from "../../../components/program-search-grid";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";
import type { TrainingProgram, User as UserType } from "@/types/database";

export default function InternshipProgramsPage() {
  const activeServiceTab = "internship";
  const [programsList, setProgramsList] = useState<ProgramCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      try {
        const [programs, users] = await Promise.all([
          getRowsFromDB<TrainingProgram>("training_program"),
          getUsersFromDB<UserType>(["team_lead", "team_member", "intern", "trainee"]),
        ]);
        const userMap = new Map<string, UserType>();
        for (const u of users) {
          userMap.set(u.id, u);
        }
        const filtered = programs.filter((p) => p.type === "internship");
        // ponytail: participant count not available from training_program table — shows 0
        const mapped: ProgramCard[] = filtered.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description ?? "",
          instructor_name: userMap.get(p.instructor_id)?.name ?? "Unassigned",
          start_date: p.start_date ?? "",
          end_date: p.end_date ?? "",
          duration: "",
          participant_count: 0,
        }));
        setProgramsList(mapped);
      } catch (error) {
        console.error("Failed to load internship programs:", error);
        setLoadError("Failed to load internship programs. Please refresh the page.");
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8 mx-auto font-aileron w-full max-w-[1240px]">
      <PageHeader
        breadcrumbTrail={internshipBreadcrumbs}
        title="Bioinformatics Services"
        subtitle="Operational workflows · Review active sequences, configurations, and analytical reporting metrics"
      />

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
                    : "bg-surface text-slate-600 border-slate-300/60 shadow-md shadow-slate-400/10 hover:bg-slate-50/50 hover:text-slate-800"
                }`}
              >
                {service.title}
              </Link>
            );
          })}
        </div>

        {/* Primary Card Wrapper containing Header & Cohort Directory details */}
        <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
          {loadError ? (
            <div className="flex items-center gap-2 p-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{loadError}</p>
            </div>
          ) : (
            <ProgramSearchGrid programs={programsList} type="internship" />
          )}
        </div>
      </div>
    );
  }
