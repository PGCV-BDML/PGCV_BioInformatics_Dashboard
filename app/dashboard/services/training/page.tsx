import React from "react";
import Link from "next/link";
import { PageHeader } from "../../../components/pageheader";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SERVICES_CONFIG } from "@/lib/services-config";
import { trainingBreadcrumbs } from "@/lib/breadcrumbs";
import ProgramSearchGrid, { type ProgramCard } from "../../../components/program-search-grid";

export default async function TrainingProgramsPage() {
  const activeServiceTab = "training";

  const supabase = await createServerSupabaseClient();
  const [{ data: programs }, { data: users }] = await Promise.all([
    supabase.from("training_program").select("*").eq("type", "training"),
    supabase.from("users").select("*"),
  ]);

  if (!programs) throw new Error("Failed to load training programs");

  const userMap = new Map<string, string>();
  for (const u of users ?? []) userMap.set(u.id, u.name);

  // ponytail: participants not available from training_program table — shows 0
  const mappedPrograms: ProgramCard[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    instructor_name: userMap.get(p.instructor_id) ?? "—",
    start_date: p.start_date ?? "",
    end_date: p.end_date ?? "",
    duration: p.duration ?? "—",
    participant_count: p.participants?.length ?? 0,
  }));

  return (
    <div className="space-y-8 mx-auto font-aileron w-full max-w-[1240px]">
      <PageHeader
        breadcrumbTrail={trainingBreadcrumbs}
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
          <ProgramSearchGrid programs={mappedPrograms} type="training" />
        </div>
      </div>
    );
  }
