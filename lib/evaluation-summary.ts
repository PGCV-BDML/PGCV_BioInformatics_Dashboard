import {
  isEvaluationRatingValue,
  POST_ACTIVITY_EVALUATION_QUESTIONS,
  type EvaluationAnswers,
  type EvaluationAnswerValue,
  type PostActivityQuestion,
} from "@/lib/evaluation-form";

export type EvaluationResponseInput = {
  participant_id: string;
  answers: Record<string, unknown> | null;
  submitted_at: string | null;
};

export type RatingStatementSummary = {
  id: string;
  statement: string;
  average: number | null;
  ratingCount: number;
  naCount: number;
};

export type RatingGroupSummary = {
  id: string;
  question: string;
  statements: RatingStatementSummary[];
};

export type ChoiceCount = {
  option: string;
  count: number;
};

export type EvaluationComment = {
  participantName: string;
  text: string;
  submittedAt: string | null;
};

export type EvaluationSummary = {
  responseCount: number;
  overallAverage: number | null;
  ratingGroups: RatingGroupSummary[];
  attendanceReasons: ChoiceCount[];
  suggestions: EvaluationComment[];
  comments: EvaluationComment[];
};

function asAnswers(value: Record<string, unknown> | null): EvaluationAnswers {
  if (!value) return {};
  return value as EvaluationAnswers;
}

function nestedGroup(
  value: EvaluationAnswerValue | undefined,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function toNumericEvaluationRating(value: unknown): number | null {
  if (!isEvaluationRatingValue(value) || value === "N/A") return null;
  return typeof value === "number" ? value : Number(value);
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function participantName(
  answers: EvaluationAnswers,
  participantId: string,
  nameByUserId: Record<string, string>,
): string {
  const fromForm = answers.eval_full_name;
  if (typeof fromForm === "string" && fromForm.trim()) return fromForm.trim();
  const fromUser = nameByUserId[participantId]?.trim();
  if (fromUser) return fromUser;
  return "Participant";
}

function textAnswer(answers: EvaluationAnswers, id: string): string {
  const value = answers[id];
  return typeof value === "string" ? value.trim() : "";
}

export function formatEvaluationAverage(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

export function summarizeEvaluationResponses(
  responses: EvaluationResponseInput[],
  nameByUserId: Record<string, string> = {},
  questions: PostActivityQuestion[] = POST_ACTIVITY_EVALUATION_QUESTIONS,
): EvaluationSummary {
  const ratingGroups = questions.filter(
    (question) => question.type === "rating_group",
  );
  const attendanceQuestion = questions.find(
    (question) =>
      question.type === "choice" && question.id === "eval_attendance_reason",
  );

  const statementTotals = new Map<string, { sum: number; count: number; na: number }>();
  for (const group of ratingGroups) {
    for (const statement of group.statements) {
      statementTotals.set(statement.id, { sum: 0, count: 0, na: 0 });
    }
  }

  const attendanceCounts = new Map<string, number>();
  if (attendanceQuestion?.type === "choice") {
    for (const option of attendanceQuestion.options) {
      attendanceCounts.set(option, 0);
    }
  }

  const suggestions: EvaluationComment[] = [];
  const comments: EvaluationComment[] = [];
  const overallValues: number[] = [];

  const sorted = [...responses].sort((a, b) =>
    (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""),
  );

  for (const response of sorted) {
    const answers = asAnswers(response.answers);
    const name = participantName(answers, response.participant_id, nameByUserId);

    for (const group of ratingGroups) {
      const nested = nestedGroup(answers[group.id]);
      for (const statement of group.statements) {
        const raw = nested[statement.id] ?? answers[statement.id];
        const totals = statementTotals.get(statement.id);
        if (!totals) continue;
        if (raw === "N/A") {
          totals.na += 1;
          continue;
        }
        const numeric = toNumericEvaluationRating(raw);
        if (numeric == null) continue;
        totals.sum += numeric;
        totals.count += 1;
        overallValues.push(numeric);
      }
    }

    if (attendanceQuestion?.type === "choice") {
      const reason = answers.eval_attendance_reason;
      if (typeof reason === "string" && attendanceCounts.has(reason)) {
        attendanceCounts.set(reason, (attendanceCounts.get(reason) ?? 0) + 1);
      }
    }

    const suggestion = textAnswer(answers, "eval_suggestions");
    if (suggestion) {
      suggestions.push({
        participantName: name,
        text: suggestion,
        submittedAt: response.submitted_at,
      });
    }
    const comment = textAnswer(answers, "eval_comments");
    if (comment) {
      comments.push({
        participantName: name,
        text: comment,
        submittedAt: response.submitted_at,
      });
    }
  }

  return {
    responseCount: responses.length,
    overallAverage: average(overallValues),
    ratingGroups: ratingGroups.map((group) => ({
      id: group.id,
      question: group.question,
      statements: group.statements.map((statement) => {
        const totals = statementTotals.get(statement.id) ?? {
          sum: 0,
          count: 0,
          na: 0,
        };
        return {
          id: statement.id,
          statement: statement.statement,
          average:
            totals.count > 0 ? roundOne(totals.sum / totals.count) : null,
          ratingCount: totals.count,
          naCount: totals.na,
        };
      }),
    })),
    attendanceReasons: [...attendanceCounts.entries()].map(
      ([option, count]) => ({ option, count }),
    ),
    suggestions,
    comments,
  };
}
