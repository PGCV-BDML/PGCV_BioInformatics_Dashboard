import type { ChoiceQuestion, McqQuestion, Question } from "@/types/database";

export const NONE_OF_THESE_OPTION = "None of these";

/** Answer key for the text typed after picking a choice question's "Other". */
export function otherAnswerId(questionId: string): string {
  return `${questionId}_other`;
}

/** Whether the learner picked the option that asks them to specify. */
export function isOtherSelected(
  question: ChoiceQuestion,
  answer: unknown,
): boolean {
  if (!question.otherOption) return false;
  return question.multiple
    ? asStringArray(answer).includes(question.otherOption)
    : answer === question.otherOption;
}

/** Tests with no multiple-choice items have nothing to score. */
export function hasScoredQuestions(questions: Question[]): boolean {
  return questions.some((question) => question.type === "mcq");
}

export function scoreMcqPercent(
  questions: Question[],
  answers: Record<string, unknown>,
): number {
  const mcqQuestions = questions.filter(
    (question): question is McqQuestion => question.type === "mcq",
  );
  if (mcqQuestions.length === 0) return 0;
  const correctCount = mcqQuestions.filter(
    (question) => answers[question.id] === question.correct,
  ).length;
  return Math.round((correctCount / mcqQuestions.length) * 100);
}

export function toggleMultiChoiceOption(
  selected: string[],
  option: string,
  exclusiveOption = NONE_OF_THESE_OPTION,
): string[] {
  if (option === exclusiveOption) {
    return selected.includes(option) ? [] : [exclusiveOption];
  }
  const withoutExclusive = selected.filter((item) => item !== exclusiveOption);
  if (withoutExclusive.includes(option)) {
    return withoutExclusive.filter((item) => item !== option);
  }
  return [...withoutExclusive, option];
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * A learner's answer as display text, or null when it was left blank.
 * `otherText` is what they typed after picking the question's "Other" option.
 */
export function formatAnswer(
  question: Question,
  answer: unknown,
  otherText?: unknown,
): string | null {
  if (question.type === "mcq") {
    return typeof answer === "number" ? (question.options[answer] ?? null) : null;
  }
  if (question.type === "choice") {
    const specified = typeof otherText === "string" ? otherText.trim() : "";
    const label = (value: string) =>
      specified && value === question.otherOption
        ? `${value}: ${specified}`
        : value;
    if (typeof answer === "string") return answer ? label(answer) : null;
    const values = asStringArray(answer);
    return values.length > 0 ? values.map(label).join(", ") : null;
  }
  if (question.type === "rating") {
    return typeof answer === "number"
      ? `${answer} / ${question.scale || 5}`
      : null;
  }
  if (question.type === "text") {
    return typeof answer === "string" && answer.trim() ? answer.trim() : null;
  }
  return null;
}
