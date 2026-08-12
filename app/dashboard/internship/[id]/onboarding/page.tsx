"use client";

import React, { use } from "react";
import ProgramOnboarding from "@/app/components/program-onboarding";

export default function InternshipOnboardingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <ProgramOnboarding
      programId={resolvedParams.id}
      programLabel="internship"
    />
  );
}
