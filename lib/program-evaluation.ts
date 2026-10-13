import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import {
  asStoredEvaluationQuestions,
  isPostActivityEvaluation,
} from "@/lib/evaluation-form";
import type { Assessment } from "@/types/database";

/**
 * Returns the program's evaluation, creating it if needed. A new evaluation
 * starts closed; staff open it at the end of the program.
 */
export async function ensureProgramEvaluation(
  programId: string,
): Promise<Assessment | null> {
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
    return existing;
  }

  try {
    return (await saveDataToDB("assessment", crypto.randomUUID(), {
      program_id: programId,
      type: "evaluation",
      questions: asStoredEvaluationQuestions(),
      is_open: false,
    })) as Assessment;
  } catch (error) {
    console.error("Could not create evaluation assessment:", error);
    return null;
  }
}
