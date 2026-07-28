"use client";

import React, { use, useState, useEffect } from "react";
import ProgramWorkspaceLayout, {
  type ProgramWorkspaceData,
} from "@/app/components/program-workspace-layout";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";
import type { TrainingProgram, User as UserType } from "@/types/database";

export default function TrainingProgramLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [program, setProgram] = useState<ProgramWorkspaceData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [programs, users] = await Promise.all([
        getRowsFromDB<TrainingProgram>("training_program"),
        getUsersFromDB(["team_lead", "team_member"]),
      ]);
      const userMap = new Map<string, string>();
      for (const u of users as UserType[]) userMap.set(u.id, u.name);
      const found = programs.find(
        (p) => p.id === resolvedParams.id && p.type === "training",
      );
      if (found) {
        setProgram({
          id: found.id,
          title: found.title,
          description: found.description ?? "",
          start_date: found.start_date ?? "",
          end_date: found.end_date ?? "",
          leaderName: userMap.get(found.instructor_id) ?? "—",
          status: found.status ?? "ongoing",
        });
      } else {
        setProgram(null);
      }
      setLoaded(true);
    };
    load();
  }, [resolvedParams.id]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ec2bb] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ProgramWorkspaceLayout programType="training" program={program}>
      {children}
    </ProgramWorkspaceLayout>
  );
}
