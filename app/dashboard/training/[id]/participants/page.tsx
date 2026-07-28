"use client";

import { use } from "react";
import ProgramParticipants from "@/app/components/program-participants";

export default function TrainingParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProgramParticipants programId={id} programType="training" />;
}
