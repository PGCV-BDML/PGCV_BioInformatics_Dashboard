"use client";

import { use } from "react";
import ParticipantAssessmentAnswers from "@/app/components/participant-assessment-answers";

export default function TrainingParticipantAnswersPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }>;
}) {
  const { id, participantId } = use(params);
  return (
    <ParticipantAssessmentAnswers
      programId={id}
      programType="training"
      participantId={participantId}
    />
  );
}
