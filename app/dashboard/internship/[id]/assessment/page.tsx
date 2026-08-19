"use client";

import { use } from "react";
import ProgramAssessment from "@/app/components/program-assessment";

export default function InternshipAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProgramAssessment programId={id} programType="internship" />;
}
