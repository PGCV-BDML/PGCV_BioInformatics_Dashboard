import { describe, expect, it } from "vitest";
import type { Question } from "@/types/database";
import {
  INTRO_BIOINFORMATICS_POST_QUESTIONS,
  INTRO_BIOINFORMATICS_PRE_QUESTIONS,
} from "./intro-bioinformatics-assessments";
import {
  buildAnswerSheet,
  buildParticipantAnswers,
  compareAnswerSheets,
} from "./assessment-answers";
import type { AssessmentResponseRow } from "./assessment-summary";

const questions: Question[] = [
  {
    type: "choice",
    id: "role",
    question: "Which best describes your role?",
    options: ["Student", "Researcher"],
    section: "Getting to know you",
  },
  {
    type: "rating",
    id: "conf",
    question: "How confident are you?",
    scale: 5,
  },
  {
    type: "mcq",
    id: "k1",
    question: "What is 16S used for?",
    options: ["Animals", "Bacteria"],
    correct: 1,
    section: "Knowledge check",
  },
  {
    type: "mcq",
    id: "k2",
    question: "What does DADA2 produce?",
    options: ["Contigs", "ASVs"],
    correct: 1,
  },
  {
    type: "mcq",
    id: "k3",
    question: "Which file holds reads?",
    options: ["FASTQ", "PDF"],
    correct: 0,
  },
  {
    type: "text",
    id: "open",
    question: "What is your biggest question?",
    multiline: true,
  },
];

function response(
  overrides: Partial<AssessmentResponseRow>,
): AssessmentResponseRow {
  return {
    id: "r1",
    assessment_id: "pre",
    participant_id: "u1",
    answers: {},
    score: null,
    submitted_at: "2026-10-01T08:00:00Z",
    ...overrides,
  };
}

describe("buildAnswerSheet", () => {
  it("marks multiple-choice answers and shows the expected option", () => {
    const sheet = buildAnswerSheet(
      questions,
      response({
        answers: { role: "Student", conf: 2, k1: 1, k2: "0", open: "  How?  " },
        score: 33,
      }),
    );

    expect(sheet.submitted).toBe(true);
    expect(sheet.score).toBe(33);
    const byId = Object.fromEntries(sheet.items.map((item) => [item.id, item]));
    expect(byId.role).toMatchObject({ answer: "Student", status: "answered" });
    expect(byId.conf).toMatchObject({ answer: "2 / 5", rating: 2 });
    expect(byId.k1).toMatchObject({
      answer: "Bacteria",
      status: "correct",
      correctAnswer: "Bacteria",
    });
    // Option indexes saved as text still resolve to the option.
    expect(byId.k2).toMatchObject({
      answer: "Contigs",
      status: "incorrect",
      correctAnswer: "ASVs",
    });
    expect(byId.k3).toMatchObject({
      answer: null,
      status: "blank",
      correctAnswer: "FASTQ",
    });
    expect(byId.open).toMatchObject({ answer: "How?", status: "answered" });
  });

  it("numbers questions within each section", () => {
    const sheet = buildAnswerSheet(questions, null);
    expect(
      sheet.items.map((item) => [item.section, item.number]),
    ).toEqual([
      ["Getting to know you", 1],
      ["Getting to know you", 2],
      ["Knowledge check", 1],
      ["Knowledge check", 2],
      ["Knowledge check", 3],
      ["Knowledge check", 4],
    ]);
  });

  it("treats a missing response as not submitted", () => {
    const sheet = buildAnswerSheet(questions, undefined);
    expect(sheet.submitted).toBe(false);
    expect(sheet.submittedAt).toBeNull();
    expect(sheet.items.every((item) => item.status === "blank")).toBe(true);
  });
});

describe("compareAnswerSheets", () => {
  it("pairs questions with the same wording and type", () => {
    const post: Question[] = [
      { ...(questions[2] as Question), id: "post_k1" },
      {
        type: "rating",
        id: "post_conf",
        question: "How  confident are you? ",
        scale: 5,
      },
      { type: "text", id: "post_open", question: "What is 16S used for?" },
    ];
    const rows = compareAnswerSheets(
      buildAnswerSheet(questions, response({ answers: { k1: 0, conf: 2 } })),
      buildAnswerSheet(
        post,
        response({ assessment_id: "post", answers: { post_k1: 1, post_conf: 4 } }),
      ),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      question: "What is 16S used for?",
      pre: { status: "incorrect" },
      post: { status: "correct" },
    });
    expect(rows[1]).toMatchObject({
      type: "rating",
      pre: { rating: 2 },
      post: { rating: 4 },
    });
  });

  it("matches the shared Introduction to Bioinformatics items", () => {
    const rows = compareAnswerSheets(
      buildAnswerSheet(INTRO_BIOINFORMATICS_PRE_QUESTIONS, null),
      buildAnswerSheet(INTRO_BIOINFORMATICS_POST_QUESTIONS, null),
    );
    expect(rows.filter((row) => row.type === "mcq")).toHaveLength(10);
    expect(rows.filter((row) => row.type === "rating")).toHaveLength(5);
  });
});

describe("buildParticipantAnswers", () => {
  it("uses the participant's latest non-cleared response per test", () => {
    const result = buildParticipantAnswers({
      participantId: "u1",
      preId: "pre",
      postId: "post",
      preQuestions: questions,
      postQuestions: questions,
      responses: [
        response({ id: "old", answers: { k1: 0 }, submitted_at: "2026-10-01" }),
        response({ id: "new", answers: { k1: 1 }, submitted_at: "2026-10-02" }),
        response({
          id: "other",
          participant_id: "u2",
          answers: { k1: 0 },
          submitted_at: "2026-10-03",
        }),
        response({
          id: "cleared",
          assessment_id: "post",
          answers: {},
          submitted_at: "2026-10-04",
        }),
      ],
    });

    expect(result.pre.submittedAt).toBe("2026-10-02");
    expect(result.pre.items.find((item) => item.id === "k1")?.status).toBe(
      "correct",
    );
    expect(result.post.submitted).toBe(false);
  });
});
