"use client";

import { use } from "react";
import TrainingPrepChecklist from "@/app/components/training-prep-checklist";
import TrainingPrepLinks from "@/app/components/training-prep-links";

export default function TrainingPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="space-y-5">
      <TrainingPrepLinks programId={id} />
      <TrainingPrepChecklist programId={id} />
    </div>
  );
}
