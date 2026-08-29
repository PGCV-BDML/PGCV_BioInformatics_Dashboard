"use client";

import { use } from "react";
import TrainingPrepChecklist from "@/app/components/training-prep-checklist";

export default function TrainingPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TrainingPrepChecklist programId={id} />;
}
