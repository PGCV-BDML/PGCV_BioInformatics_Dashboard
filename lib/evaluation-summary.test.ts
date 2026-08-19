import { describe, expect, it } from "vitest";
import type { EvaluationAnswers } from "./evaluation-form";
import {
  formatEvaluationAverage,
  hasEvaluationAnswers,
  summarizeEvaluationResponses,
  toNumericEvaluationRating,
} from "./evaluation-summary";

function answers(
  overrides: Partial<EvaluationAnswers> = {},
): EvaluationAnswers {
  return {
    eval_full_name: "Ada Lovelace",
    eval_topics: {
      eval_topics_usefulness: 5,
      eval_topics_objectives: 4,
      eval_topics_pacing: 3,
      eval_topics_exercises: "N/A",
    },
    eval_speaker: {
      eval_speaker_knowledge: 5,
      eval_speaker_preparedness: 5,
    },
    eval_materials: {
      eval_materials_presentation: 4,
      eval_materials_handouts: 4,
      eval_materials_exercises: 3,
    },
    eval_organizers: {
      eval_organizers_helpfulness: 5,
    },
    eval_venue_facilities: {
      eval_venue_space: 4,
      eval_venue_safety: 5,
    },
    eval_food: {
      eval_food_taste: "N/A",
    },
    eval_overall: {
      eval_overall_quality: 5,
    },
    eval_attendance_reason: "Voluntary/Interested in the Topic",
    eval_suggestions: "More hands-on time.",
    eval_comments: "Clear and well paced.",
    ...overrides,
  };
}

describe("hasEvaluationAnswers", () => {
  it("treats empty or wiped payloads as no response", () => {
    expect(hasEvaluationAnswers(null)).toBe(false);
    expect(hasEvaluationAnswers({})).toBe(false);
    expect(hasEvaluationAnswers({ eval_full_name: "  " })).toBe(false);
  });

  it("detects ratings and comments", () => {
    expect(hasEvaluationAnswers(answers())).toBe(true);
    expect(hasEvaluationAnswers({ eval_comments: "Great." })).toBe(true);
  });
});

describe("toNumericEvaluationRating", () => {
  it("keeps 1–5 and drops N/A", () => {
    expect(toNumericEvaluationRating(5)).toBe(5);
    expect(toNumericEvaluationRating("4")).toBe(4);
    expect(toNumericEvaluationRating("N/A")).toBeNull();
    expect(toNumericEvaluationRating("")).toBeNull();
  });
});

describe("summarizeEvaluationResponses", () => {
  it("returns empty totals when nobody has submitted", () => {
    const summary = summarizeEvaluationResponses([]);
    expect(summary.responseCount).toBe(0);
    expect(summary.overallAverage).toBeNull();
    expect(summary.suggestions).toEqual([]);
    expect(summary.comments).toEqual([]);
    expect(summary.attendanceReasons.every((row) => row.count === 0)).toBe(
      true,
    );
  });

  it("averages numeric ratings and ignores N/A", () => {
    const summary = summarizeEvaluationResponses([
      {
        participant_id: "ada",
        submitted_at: "2026-08-03T10:00:00.000Z",
        answers: answers(),
      },
      {
        participant_id: "grace",
        submitted_at: "2026-08-04T10:00:00.000Z",
        answers: answers({
          eval_full_name: "Grace Hopper",
          eval_topics: {
            eval_topics_usefulness: 3,
            eval_topics_objectives: 4,
            eval_topics_pacing: 5,
            eval_topics_exercises: 2,
          },
          eval_food: { eval_food_taste: 4 },
          eval_attendance_reason: "Required",
          eval_suggestions: "",
          eval_comments: "  ",
        }),
      },
    ]);

    expect(summary.responseCount).toBe(2);
    const usefulness = summary.ratingGroups
      .find((group) => group.id === "eval_topics")
      ?.statements.find((row) => row.id === "eval_topics_usefulness");
    expect(usefulness).toMatchObject({
      average: 4,
      ratingCount: 2,
      naCount: 0,
    });

    const exercises = summary.ratingGroups
      .find((group) => group.id === "eval_topics")
      ?.statements.find((row) => row.id === "eval_topics_exercises");
    expect(exercises).toMatchObject({
      average: 2,
      ratingCount: 1,
      naCount: 1,
    });

    const food = summary.ratingGroups
      .find((group) => group.id === "eval_food")
      ?.statements.find((row) => row.id === "eval_food_taste");
    expect(food).toMatchObject({
      average: 4,
      ratingCount: 1,
      naCount: 1,
    });

    expect(summary.attendanceReasons).toEqual([
      { option: "Required", count: 1 },
      { option: "Voluntary/Interested in the Topic", count: 1 },
      { option: "Invited", count: 0 },
    ]);
  });

  it("collects comments newest first and falls back to the user name", () => {
    const summary = summarizeEvaluationResponses(
      [
        {
          participant_id: "ada",
          submitted_at: "2026-08-03T10:00:00.000Z",
          answers: answers({ eval_suggestions: "More labs." }),
        },
        {
          participant_id: "grace",
          submitted_at: "2026-08-05T10:00:00.000Z",
          answers: answers({
            eval_full_name: "  ",
            eval_suggestions: "Shorter lectures.",
            eval_comments: "Excellent.",
          }),
        },
      ],
      { grace: "Grace Hopper" },
    );

    expect(summary.suggestions.map((row) => row.participantName)).toEqual([
      "Grace Hopper",
      "Ada Lovelace",
    ]);
    expect(summary.comments).toEqual([
      {
        participantName: "Grace Hopper",
        text: "Excellent.",
        submittedAt: "2026-08-05T10:00:00.000Z",
      },
      {
        participantName: "Ada Lovelace",
        text: "Clear and well paced.",
        submittedAt: "2026-08-03T10:00:00.000Z",
      },
    ]);
  });
});

describe("formatEvaluationAverage", () => {
  it("shows one decimal or an em dash", () => {
    expect(formatEvaluationAverage(4.6)).toBe("4.6");
    expect(formatEvaluationAverage(null)).toBe("—");
  });
});
