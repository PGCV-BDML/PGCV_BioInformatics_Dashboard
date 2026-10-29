import { fileDate, fileSlug } from "@/lib/assessment-export";
import {
  EVALUATION_FORM_QUESTIONS,
  type EvaluationAnswers,
  type EvaluationAnswerValue,
  type PostActivityQuestion,
} from "@/lib/evaluation-form";
import {
  evaluationParticipantName,
  hasEvaluationAnswers,
  toNumericEvaluationRating,
  type EvaluationResponseInput,
} from "@/lib/evaluation-summary";

export type EvaluationExportTable = {
  header: string[];
  rows: string[][];
};

type ExportColumn = {
  header: string;
  read: (answers: EvaluationAnswers) => string;
};

const NAME_QUESTION_ID = "eval_full_name";

function textValue(value: EvaluationAnswerValue | undefined): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim())
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

function ratingValue(raw: unknown): string {
  if (raw === "N/A") return "N/A";
  const numeric = toNumericEvaluationRating(raw);
  return numeric == null ? "" : String(numeric);
}

function groupAnswers(
  value: EvaluationAnswerValue | undefined,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

// Each rating statement gets its own column, read like the summary reads it:
// nested under its group first, then the older flat answer.
function columnsFor(questions: PostActivityQuestion[]): ExportColumn[] {
  return questions.flatMap((question): ExportColumn[] => {
    if (question.type === "rating_group") {
      return question.statements.map((statement) => ({
        header: `${question.question} — ${statement.statement}`,
        read: (answers) =>
          ratingValue(
            groupAnswers(answers[question.id])[statement.id] ??
              answers[statement.id],
          ),
      }));
    }
    return [
      {
        header: question.question,
        read: (answers) => textValue(answers[question.id]),
      },
    ];
  });
}

/**
 * One row per submitted evaluation, sorted by name. Cleared responses are
 * left out, so the row count matches the summary's response count.
 */
export function buildEvaluationExportTable(input: {
  responses: EvaluationResponseInput[];
  nameByUserId?: Record<string, string>;
  questions?: PostActivityQuestion[];
}): EvaluationExportTable {
  const questions = input.questions ?? EVALUATION_FORM_QUESTIONS;
  const columns = columnsFor(
    questions.filter((question) => question.id !== NAME_QUESTION_ID),
  );

  const submitted = input.responses
    .filter((response) => hasEvaluationAnswers(response.answers))
    .map((response) => {
      const answers = (response.answers ?? {}) as EvaluationAnswers;
      return {
        answers,
        participantId: response.participant_id,
        name: evaluationParticipantName(
          answers,
          response.participant_id,
          input.nameByUserId ?? {},
        ),
        submittedAt: response.submitted_at ?? "",
      };
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.participantId.localeCompare(b.participantId),
    );

  return {
    header: [
      "Full Name",
      "Submitted At",
      ...columns.map((column) => column.header),
    ],
    rows: submitted.map((response) => [
      response.name,
      response.submittedAt,
      ...columns.map((column) => column.read(response.answers)),
    ]),
  };
}

export function evaluationExportFileName(input?: {
  programTitle?: string | null;
  date?: Date;
}): string {
  const stamp = fileDate(input?.date ?? new Date());
  const title = input?.programTitle?.trim();
  if (!title) return `evaluation-responses-${stamp}.csv`;
  return `evaluation-responses-${fileSlug(title)}-${stamp}.csv`;
}
