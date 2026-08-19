import type { AssessmentResponse, Question } from "@/types/database";

export type AssessmentResponseRow = Pick<
  AssessmentResponse,
  "id" | "assessment_id" | "participant_id" | "answers" | "score" | "submitted_at"
>;

export type McqItemSummary = {
  id: string;
  question: string;
  correctPercent: number | null;
  answeredCount: number;
};

export type TestTextAnswer = {
  question: string;
  participantName: string;
  text: string;
  submittedAt: string | null;
};

export type TestSummary = {
  assessmentId: string | null;
  questionCount: number;
  responseCount: number;
  averageScore: number | null;
  responseIds: string[];
  mcqItems: McqItemSummary[];
  textAnswers: TestTextAnswer[];
};

export type ParticipantScoreRow = {
  participantId: string;
  name: string;
  preScore: number | null;
  postScore: number | null;
};

export type ProgramAssessmentSummaryData = {
  pre: TestSummary;
  post: TestSummary;
  participants: ParticipantScoreRow[];
  averageGain: number | null;
};

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function asOptionIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    if (Number.isInteger(numeric)) return numeric;
  }
  return null;
}

export function latestResponsesByParticipant(
  responses: AssessmentResponseRow[],
): AssessmentResponseRow[] {
  const latest = new Map<string, AssessmentResponseRow>();
  for (const row of responses) {
    const key = `${row.assessment_id}:${row.participant_id}`;
    const current = latest.get(key);
    if (
      !current ||
      (row.submitted_at ?? "") > (current.submitted_at ?? "")
    ) {
      latest.set(key, row);
    }
  }
  return [...latest.values()];
}

function hasAnswerPayload(
  answers: Record<string, unknown> | null | undefined,
): boolean {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return false;
  }
  return Object.keys(answers).length > 0;
}

function summarizeOneTest(
  questions: Question[],
  assessmentId: string | null,
  responses: AssessmentResponseRow[],
  nameByUserId: Record<string, string>,
): TestSummary {
  const forTest = assessmentId
    ? responses.filter((row) => row.assessment_id === assessmentId)
    : [];
  const scores = forTest
    .map((row) => row.score)
    .filter((score): score is number => typeof score === "number");

  const mcqItems: McqItemSummary[] = questions
    .filter((question): question is Question & { type: "mcq" } => question.type === "mcq")
    .map((question) => {
      let answeredCount = 0;
      let correctCount = 0;
      for (const row of forTest) {
        const index = asOptionIndex(row.answers?.[question.id]);
        if (index == null) continue;
        answeredCount += 1;
        if (index === question.correct) correctCount += 1;
      }
      return {
        id: question.id,
        question: question.question,
        answeredCount,
        correctPercent:
          answeredCount > 0
            ? Math.round((correctCount / answeredCount) * 100)
            : null,
      };
    });

  const textAnswers: TestTextAnswer[] = [];
  for (const question of questions) {
    if (question.type !== "text") continue;
    for (const row of forTest) {
      const value = row.answers?.[question.id];
      if (typeof value !== "string" || value.trim() === "") continue;
      textAnswers.push({
        question: question.question,
        participantName:
          nameByUserId[row.participant_id]?.trim() || "Participant",
        text: value.trim(),
        submittedAt: row.submitted_at,
      });
    }
  }

  return {
    assessmentId,
    questionCount: questions.length,
    responseCount: forTest.length,
    averageScore: average(scores),
    responseIds: forTest.map((row) => row.id),
    mcqItems,
    textAnswers,
  };
}

export function summarizeProgramAssessments(input: {
  preId: string | null;
  postId: string | null;
  preQuestions: Question[];
  postQuestions: Question[];
  responses: AssessmentResponseRow[];
  nameByUserId?: Record<string, string>;
}): ProgramAssessmentSummaryData {
  const nameByUserId = input.nameByUserId ?? {};
  const latest = latestResponsesByParticipant(
    input.responses.filter((row) => hasAnswerPayload(row.answers)),
  );

  const pre = summarizeOneTest(
    input.preQuestions,
    input.preId,
    latest,
    nameByUserId,
  );
  const post = summarizeOneTest(
    input.postQuestions,
    input.postId,
    latest,
    nameByUserId,
  );

  const preByUser = new Map(
    latest
      .filter((row) => row.assessment_id === input.preId)
      .map((row) => [row.participant_id, row]),
  );
  const postByUser = new Map(
    latest
      .filter((row) => row.assessment_id === input.postId)
      .map((row) => [row.participant_id, row]),
  );

  const participantIds = [
    ...new Set([...preByUser.keys(), ...postByUser.keys()]),
  ];
  const participants: ParticipantScoreRow[] = participantIds
    .map((participantId) => ({
      participantId,
      name: nameByUserId[participantId]?.trim() || "Participant",
      preScore: preByUser.get(participantId)?.score ?? null,
      postScore: postByUser.get(participantId)?.score ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const gains = participants
    .filter(
      (row) => typeof row.preScore === "number" && typeof row.postScore === "number",
    )
    .map((row) => (row.postScore as number) - (row.preScore as number));

  return {
    pre,
    post,
    participants,
    averageGain: average(gains),
  };
}

export function formatAssessmentAverage(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
