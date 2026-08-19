"use client";

import { use } from "react";
import ProgramAssessment from "@/app/components/program-assessment";

export default function AssessmentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProgramAssessment programId={id} programType="training" />;
}
