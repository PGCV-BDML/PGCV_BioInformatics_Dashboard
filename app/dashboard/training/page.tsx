"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/app/components/pageheader";
import { trainingBreadcrumbs } from "@/lib/breadcrumbs";
import ProgramSearchGrid, {
  type ProgramCard,
} from "@/app/components/program-search-grid";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";
import type { TrainingProgram, User as UserType } from "@/types/database";

export default function TrainingProgramsPage() {
  const [programsList, setProgramsList] = useState<ProgramCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      try {
        const [programs, users] = await Promise.all([
          getRowsFromDB<TrainingProgram>("training_program"),
          getUsersFromDB<UserType>([
            "team_lead",
            "team_member",
            "intern",
            "trainee",
          ]),
        ]);
        const userMap = new Map<string, UserType>();
        for (const u of users) {
          userMap.set(u.id, u);
        }
        const filtered = programs.filter((p) => p.type === "training");
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
        console.error("Failed to load training programs:", error);
        setLoadError(
          "Failed to load training programs. Please refresh the page.",
        );
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8 mx-auto font-aileron w-full max-w-[1240px]">
      <PageHeader
        breadcrumbTrail={trainingBreadcrumbs}
        title="Training"
        subtitle="Manage training cohorts, modules, assessments, and certificates"
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
        {loadError ? (
          <div className="flex items-center gap-2 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{loadError}</p>
          </div>
        ) : (
          <ProgramSearchGrid programs={programsList} type="training" />
        )}
      </div>
    </div>
  );
}
