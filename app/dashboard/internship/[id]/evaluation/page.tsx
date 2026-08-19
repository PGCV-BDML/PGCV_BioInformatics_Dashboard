"use client";

import { use } from "react";
import ProgramEvaluationForm from "@/app/components/program-evaluation-form";

export default function InternshipEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProgramEvaluationForm programId={id} programType="internship" />;
}
