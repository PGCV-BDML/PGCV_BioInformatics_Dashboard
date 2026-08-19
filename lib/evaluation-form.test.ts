import { describe, expect, it } from "vitest";
import {
  isPostActivityEvaluation,
  missingRequiredAnswers,
  POST_ACTIVITY_EVALUATION_QUESTIONS,
  prefillEvaluationAnswers,
  type EvaluationAnswers,
} from "./evaluation-form";

function completeAnswers(): EvaluationAnswers {
  return {
    eval_full_name: "Ada Lovelace",
    eval_email: "ada@example.com",
    eval_activity_title: "16S Training",
    eval_start_date: "2026-08-01",
    eval_end_date: "2026-08-03",
    eval_venue: "PGC Visayas",
    eval_institution: "UP Visayas",
    eval_sex: "Female",
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
  };
}

describe("POST_ACTIVITY_EVALUATION_QUESTIONS", () => {
  it("has the 19 post-activity form questions", () => {
    expect(POST_ACTIVITY_EVALUATION_QUESTIONS).toHaveLength(19);
    expect(POST_ACTIVITY_EVALUATION_QUESTIONS.map((q) => q.id)).toEqual([
      "eval_full_name",
      "eval_email",
      "eval_activity_title",
      "eval_start_date",
      "eval_end_date",
      "eval_venue",
      "eval_designation",
      "eval_institution",
      "eval_sex",
      "eval_topics",
      "eval_speaker",
      "eval_materials",
      "eval_organizers",
      "eval_venue_facilities",
      "eval_food",
      "eval_overall",
      "eval_attendance_reason",
      "eval_suggestions",
      "eval_comments",
    ]);
  });

  it("treats designation, suggestions, and comments as optional", () => {
    const optional = POST_ACTIVITY_EVALUATION_QUESTIONS.filter(
      (question) => question.required === false,
    );
    expect(optional.map((question) => question.id)).toEqual([
      "eval_designation",
      "eval_suggestions",
      "eval_comments",
    ]);
    expect(
      POST_ACTIVITY_EVALUATION_QUESTIONS.filter(
        (question) => question.required !== false,
      ),
    ).toHaveLength(16);
  });
});

describe("isPostActivityEvaluation", () => {
  it("detects the canonical form by question id", () => {
    expect(
      isPostActivityEvaluation(POST_ACTIVITY_EVALUATION_QUESTIONS),
    ).toBe(true);
    expect(
      isPostActivityEvaluation([
        { type: "rating", id: "ev1", question: "Old prompt", scale: 5 },
      ]),
    ).toBe(false);
    expect(isPostActivityEvaluation(null)).toBe(false);
  });
});

describe("missingRequiredAnswers", () => {
  it("returns no missing keys for a complete response, including N/A ratings", () => {
    expect(
      missingRequiredAnswers(
        POST_ACTIVITY_EVALUATION_QUESTIONS,
        completeAnswers(),
      ),
    ).toEqual([]);
  });

  it("allows designation, suggestions, and comments to stay blank", () => {
    const answers = completeAnswers();
    delete answers.eval_designation;
    delete answers.eval_suggestions;
    delete answers.eval_comments;
    expect(
      missingRequiredAnswers(POST_ACTIVITY_EVALUATION_QUESTIONS, answers),
    ).toEqual([]);
  });

  it("flags blank required text, choice, and incomplete rating groups", () => {
    const answers = completeAnswers();
    answers.eval_full_name = "  ";
    answers.eval_sex = "Prefer not to say";
    answers.eval_topics = {
      eval_topics_usefulness: 5,
      eval_topics_objectives: 4,
      eval_topics_pacing: 3,
    };

    expect(
      missingRequiredAnswers(POST_ACTIVITY_EVALUATION_QUESTIONS, answers),
    ).toEqual([
      "eval_full_name",
      "eval_sex",
      "eval_topics_exercises",
    ]);
  });
});

describe("prefillEvaluationAnswers", () => {
  it("copies known participant and program fields", () => {
    expect(
      prefillEvaluationAnswers({
        name: "  Ada Lovelace  ",
        email: "ada@example.com",
        activityTitle: "16S Training",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-08-03",
        institution: "UP Visayas",
        designation: "Intern",
      }),
    ).toEqual({
      eval_full_name: "Ada Lovelace",
      eval_email: "ada@example.com",
      eval_activity_title: "16S Training",
      eval_start_date: "2026-08-01",
      eval_end_date: "2026-08-03",
      eval_institution: "UP Visayas",
      eval_designation: "Intern",
    });
  });

  it("omits empty fields", () => {
    expect(prefillEvaluationAnswers({ name: " ", email: null })).toEqual({});
  });
});
