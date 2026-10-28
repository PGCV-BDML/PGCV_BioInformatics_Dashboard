import {
  DASHBOARD_EVALUATION_QUESTIONS,
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

export type DashboardFeedbackSummary = {
  /** Responses that answered at least one dashboard question. */
  responseCount: number;
  overallAverage: number | null;
  ratingGroups: RatingGroupSummary[];
  devices: ChoiceCount[];
  issues: EvaluationComment[];
  suggestions: EvaluationComment[];
};

type RatingGroupQuestion = Extract<PostActivityQuestion, { type: "rating_group" }>;
type ChoiceQuestion = Extract<PostActivityQuestion, { type: "choice" }>;

type NamedResponse = {
  answers: EvaluationAnswers;
  name: string;
  submittedAt: string | null;
};

function asAnswers(value: Record<string, unknown> | null): EvaluationAnswers {
  if (!value) return {};
  return value as EvaluationAnswers;
}

export function hasEvaluationAnswers(
  answers: Record<string, unknown> | null | undefined,
): boolean {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return false;
  }
  return Object.values(answers).some((value) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return true;
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).length > 0;
    }
    return true;
  });
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

function newestFirst(
  responses: EvaluationResponseInput[],
  nameByUserId: Record<string, string>,
): NamedResponse[] {
  return [...responses]
    .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""))
    .map((response) => {
      const answers = asAnswers(response.answers);
      return {
        answers,
        name: participantName(answers, response.participant_id, nameByUserId),
        submittedAt: response.submitted_at,
      };
    });
}

function summarizeRatingGroups(
  groups: RatingGroupQuestion[],
  responses: NamedResponse[],
): { ratingGroups: RatingGroupSummary[]; overallAverage: number | null } {
  const statementTotals = new Map<string, { sum: number; count: number; na: number }>();
  for (const group of groups) {
    for (const statement of group.statements) {
      statementTotals.set(statement.id, { sum: 0, count: 0, na: 0 });
    }
  }
  const overallValues: number[] = [];

  for (const { answers } of responses) {
    for (const group of groups) {
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
  }

  return {
    overallAverage: average(overallValues),
    ratingGroups: groups.map((group) => ({
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
  };
}

function countChoices(
  question: ChoiceQuestion | undefined,
  responses: NamedResponse[],
): ChoiceCount[] {
  if (!question) return [];
  const counts = new Map<string, number>(
    question.options.map((option) => [option, 0]),
  );
  for (const { answers } of responses) {
    const value = answers[question.id];
    if (typeof value === "string" && counts.has(value)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([option, count]) => ({ option, count }));
}

function collectText(
  responses: NamedResponse[],
  id: string,
): EvaluationComment[] {
  const entries: EvaluationComment[] = [];
  for (const response of responses) {
    const text = textAnswer(response.answers, id);
    if (text) {
      entries.push({
        participantName: response.name,
        text,
        submittedAt: response.submittedAt,
      });
    }
  }
  return entries;
}

function findChoice(
  questions: PostActivityQuestion[],
  id: string,
): ChoiceQuestion | undefined {
  return questions.find(
    (question): question is ChoiceQuestion =>
      question.type === "choice" && question.id === id,
  );
}

function ratingGroupsOf(
  questions: PostActivityQuestion[],
): RatingGroupQuestion[] {
  return questions.filter(
    (question): question is RatingGroupQuestion =>
      question.type === "rating_group",
  );
}

/** Summarizes the official post-activity form; dashboard answers are left out. */
export function summarizeEvaluationResponses(
  responses: EvaluationResponseInput[],
  nameByUserId: Record<string, string> = {},
  questions: PostActivityQuestion[] = POST_ACTIVITY_EVALUATION_QUESTIONS,
): EvaluationSummary {
  const sorted = newestFirst(responses, nameByUserId);
  const { ratingGroups, overallAverage } = summarizeRatingGroups(
    ratingGroupsOf(questions),
    sorted,
  );

  return {
    responseCount: responses.length,
    overallAverage,
    ratingGroups,
    attendanceReasons: countChoices(
      findChoice(questions, "eval_attendance_reason"),
      sorted,
    ),
    suggestions: collectText(sorted, "eval_suggestions"),
    comments: collectText(sorted, "eval_comments"),
  };
}

/**
 * Summarizes the dashboard feedback section. Evaluations submitted before it
 * was added have no dashboard answers and are not counted.
 */
export function summarizeDashboardFeedback(
  responses: EvaluationResponseInput[],
  nameByUserId: Record<string, string> = {},
  questions: PostActivityQuestion[] = DASHBOARD_EVALUATION_QUESTIONS,
): DashboardFeedbackSummary {
  const questionIds = questions.map((question) => question.id);
  const answered = newestFirst(responses, nameByUserId).filter(({ answers }) =>
    hasEvaluationAnswers(
      Object.fromEntries(questionIds.map((id) => [id, answers[id]])),
    ),
  );
  const { ratingGroups, overallAverage } = summarizeRatingGroups(
    ratingGroupsOf(questions),
    answered,
  );

  return {
    responseCount: answered.length,
    overallAverage,
    ratingGroups,
    devices: countChoices(findChoice(questions, "eval_dash_device"), answered),
    issues: collectText(answered, "eval_dash_issues"),
    suggestions: collectText(answered, "eval_dash_suggestions"),
  };
}
