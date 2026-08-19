import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import {
  asStoredEvaluationQuestions,
  isPostActivityEvaluation,
} from "@/lib/evaluation-form";
import type { Assessment } from "@/types/database";

export async function ensureProgramEvaluation(
  programId: string,
): Promise<string | null> {
  const assessments = await getRowsFromDB<Assessment>("assessment");
  const existing = assessments.find(
    (assessment) =>
      assessment.program_id === programId && assessment.type === "evaluation",
  );

  if (existing) {
    if (!isPostActivityEvaluation(existing.questions)) {
      try {
        await saveDataToDB("assessment", existing.id, {
          questions: asStoredEvaluationQuestions(),
        });
      } catch (error) {
        console.error("Could not update evaluation questions:", error);
      }
    }
    return existing.id;
  }

  try {
    const id = crypto.randomUUID();
    await saveDataToDB("assessment", id, {
      program_id: programId,
      type: "evaluation",
      questions: asStoredEvaluationQuestions(),
    });
    return id;
  } catch (error) {
    console.error("Could not create evaluation assessment:", error);
    return null;
  }
}
