import type { McqQuestion, Question } from "@/types/database";

export const NONE_OF_THESE_OPTION = "None of these";

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
