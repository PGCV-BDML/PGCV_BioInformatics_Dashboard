import { formatAnswer } from "@/lib/assessment-form";
import {
  asOptionIndex,
  hasAnswerPayload,
  latestResponsesByParticipant,
  type AssessmentResponseRow,
} from "@/lib/assessment-summary";
import type { Question } from "@/types/database";

/** correct/incorrect only apply to scored multiple-choice items. */
export type AnswerStatus = "correct" | "incorrect" | "answered" | "blank";

export type AnswerSheetItem = {
  id: string;
  /** Numbering restarts at each section, matching the learner's form. */
  number: number;
  section: string | null;
  type: Question["type"];
  question: string;
  answer: string | null;
  status: AnswerStatus;
  /** Set for multiple-choice items so staff can see the expected option. */
  correctAnswer: string | null;
  /** Raw value for rating items, used to show the pre → post change. */
  rating: number | null;
};

export type AnswerSheet = {
  submitted: boolean;
  submittedAt: string | null;
  score: number | null;
  items: AnswerSheetItem[];
};

export type AnswerComparisonRow = {
  question: string;
  type: Question["type"];
  pre: AnswerSheetItem;
  post: AnswerSheetItem;
};

export type ParticipantAnswers = {
  pre: AnswerSheet;
  post: AnswerSheet;
  /** Questions asked in both tests, matched by wording, in post-test order. */
  comparison: AnswerComparisonRow[];
};

function describeItem(
  question: Question,
  raw: unknown,
  number: number,
  section: string | null,
): AnswerSheetItem {
  const base = {
    id: question.id,
    number,
    section,
    type: question.type,
    question: question.question,
    correctAnswer: null,
    rating: null,
  };

  if (question.type === "mcq") {
    const index = asOptionIndex(raw);
    const answer = index == null ? null : (question.options[index] ?? null);
    return {
      ...base,
      answer,
      correctAnswer: question.options[question.correct] ?? null,
      status:
        answer == null
          ? "blank"
          : index === question.correct
            ? "correct"
            : "incorrect",
    };
  }

  const answer = formatAnswer(question, raw);
  return {
    ...base,
    answer,
    rating:
      question.type === "rating" && typeof raw === "number" ? raw : null,
    status: answer == null ? "blank" : "answered",
  };
}

export function buildAnswerSheet(
  questions: Question[],
  response: AssessmentResponseRow | null | undefined,
): AnswerSheet {
  const answers = response?.answers ?? {};
  let number = 0;
  let section: string | null = null;
  const items = questions.map((question) => {
    if (question.section) {
      section = question.section;
      number = 0;
    }
    number += 1;
    return describeItem(question, answers[question.id], number, section);
  });

  return {
    submitted: Boolean(response),
    submittedAt: response?.submitted_at ?? null,
    score: response?.score ?? null,
    items,
  };
}

function normalizeQuestionText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Pre- and post-test questions have different ids, so shared questions are
 * paired by their wording (and type) instead.
 */
export function compareAnswerSheets(
  pre: AnswerSheet,
  post: AnswerSheet,
): AnswerComparisonRow[] {
  const preByText = new Map<string, AnswerSheetItem>();
  for (const item of pre.items) {
    const key = `${item.type}:${normalizeQuestionText(item.question)}`;
    if (!preByText.has(key)) preByText.set(key, item);
  }

  const rows: AnswerComparisonRow[] = [];
  for (const item of post.items) {
    const match = preByText.get(
      `${item.type}:${normalizeQuestionText(item.question)}`,
    );
    if (!match) continue;
    rows.push({ question: item.question, type: item.type, pre: match, post: item });
  }
  return rows;
}

export function buildParticipantAnswers(input: {
  participantId: string;
  preId: string | null;
  postId: string | null;
  preQuestions: Question[];
  postQuestions: Question[];
  responses: AssessmentResponseRow[];
}): ParticipantAnswers {
  const latest = latestResponsesByParticipant(
    input.responses.filter(
      (row) =>
        row.participant_id === input.participantId &&
        hasAnswerPayload(row.answers),
    ),
  );
  const preResponse = input.preId
    ? latest.find((row) => row.assessment_id === input.preId)
    : undefined;
  const postResponse = input.postId
    ? latest.find((row) => row.assessment_id === input.postId)
    : undefined;

  const pre = buildAnswerSheet(input.preQuestions, preResponse);
  const post = buildAnswerSheet(input.postQuestions, postResponse);

  return {
    pre,
    post,
    comparison: compareAnswerSheets(pre, post),
  };
}
