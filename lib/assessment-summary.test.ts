import { describe, expect, it } from "vitest";
import type { Question } from "@/types/database";
import {
  asOptionIndex,
  formatAssessmentAverage,
  latestResponsesByParticipant,
  summarizeProgramAssessments,
} from "./assessment-summary";

const preQuestions: Question[] = [
  {
    type: "mcq",
    id: "q1",
    question: "What is 16S used for?",
    options: ["Animals", "Bacteria"],
    correct: 1,
  },
];

const postQuestions: Question[] = [
  {
    type: "mcq",
    id: "q2",
    question: "What does DADA2 produce?",
    options: ["Contigs", "ASVs"],
    correct: 1,
  },
  {
    type: "text",
    id: "q3",
    question: "Describe the workflow.",
    multiline: true,
  },
];

describe("asOptionIndex", () => {
  it("accepts integer indexes including numeric strings", () => {
    expect(asOptionIndex(1)).toBe(1);
    expect(asOptionIndex("0")).toBe(0);
    expect(asOptionIndex("")).toBeNull();
    expect(asOptionIndex("N/A")).toBeNull();
  });
});

describe("latestResponsesByParticipant", () => {
  it("keeps the newest row per person and test", () => {
    const latest = latestResponsesByParticipant([
      {
        id: "old",
        assessment_id: "pre",
        participant_id: "ada",
        answers: { q1: 0 },
        score: 0,
        submitted_at: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "new",
        assessment_id: "pre",
        participant_id: "ada",
        answers: { q1: 1 },
        score: 100,
        submitted_at: "2026-08-02T00:00:00.000Z",
      },
    ]);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.id).toBe("new");
  });
});

describe("summarizeProgramAssessments", () => {
  it("averages scores, item accuracy, and gain", () => {
    const summary = summarizeProgramAssessments({
      preId: "pre",
      postId: "post",
      preQuestions,
      postQuestions,
      nameByUserId: { ada: "Ada Lovelace", grace: "Grace Hopper" },
      responses: [
        {
          id: "p1",
          assessment_id: "pre",
          participant_id: "ada",
          answers: { q1: 1 },
          score: 100,
          submitted_at: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "p2",
          assessment_id: "pre",
          participant_id: "grace",
          answers: { q1: 0 },
          score: 0,
          submitted_at: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "s1",
          assessment_id: "post",
          participant_id: "ada",
          answers: { q2: 1, q3: "FastQC, DADA2, SILVA." },
          score: 100,
          submitted_at: "2026-08-03T00:00:00.000Z",
        },
      ],
    });

    expect(summary.pre.responseCount).toBe(2);
    expect(summary.pre.averageScore).toBe(50);
    expect(summary.pre.mcqItems[0]).toMatchObject({
      answeredCount: 2,
      correctPercent: 50,
    });
    expect(summary.post.responseCount).toBe(1);
    expect(summary.post.averageScore).toBe(100);
    expect(summary.averageGain).toBe(0);
    expect(summary.participants.map((row) => row.name)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
    expect(summary.post.textAnswers).toEqual([
      {
        question: "Describe the workflow.",
        participantName: "Ada Lovelace",
        text: "FastQC, DADA2, SILVA.",
        submittedAt: "2026-08-03T00:00:00.000Z",
      },
    ]);
  });

  it("ignores wiped empty answers", () => {
    const summary = summarizeProgramAssessments({
      preId: "pre",
      postId: "post",
      preQuestions,
      postQuestions,
      responses: [
        {
          id: "wiped",
          assessment_id: "pre",
          participant_id: "ada",
          answers: {},
          score: 100,
          submitted_at: "2026-08-01T00:00:00.000Z",
        },
      ],
    });
    expect(summary.pre.responseCount).toBe(0);
    expect(summary.pre.averageScore).toBeNull();
  });
});

describe("formatAssessmentAverage", () => {
  it("shows a dash, whole numbers, or one decimal", () => {
    expect(formatAssessmentAverage(null)).toBe("—");
    expect(formatAssessmentAverage(80)).toBe("80");
    expect(formatAssessmentAverage(80.5)).toBe("80.5");
  });
});
