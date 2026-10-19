"use client";

import { use } from "react";
import ProgramPresentations from "@/app/components/program-presentations";

export default function TrainingPresentationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProgramPresentations programId={id} />;
}
