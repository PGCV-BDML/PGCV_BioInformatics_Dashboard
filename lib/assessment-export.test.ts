import { describe, expect, it } from "vitest";
import type { Question } from "@/types/database";
import {
  buildResponseExportRows,
  responseExportFileName,
  toCsv,
} from "./assessment-export";
import type { AssessmentResponseRow } from "./assessment-summary";

const questions: Question[] = [
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

const usersById = {
  u1: { name: "Ada Lovelace", email: "ada@example.com", institution: "PGCV" },
  u2: { name: "Ben Cruz", email: "ben@example.com", institution: "UP" },
};

describe("buildResponseExportRows", () => {
  it("writes option text, expected answers, and correct or incorrect status", () => {
    const rows = buildResponseExportRows({
      preId: "pre",
      postId: "post",
      preQuestions: questions,
      postQuestions: questions,
      responses: [
        response({
          answers: { k1: 1, k2: "0", open: "" },
          score: 50,
        }),
      ],
      usersById,
    });

    expect(rows.map((row) => row.question)).toEqual([
      "What is 16S used for?",
      "What does DADA2 produce?",
      "What is your biggest question?",
    ]);
    expect(rows[0]).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      institution: "PGCV",
      test: "pre_test",
      section: "Knowledge check",
      number: 1,
      type: "mcq",
      answer: "Bacteria",
      correct_answer: "Bacteria",
      status: "correct",
      score: "50",
      submitted_at: "2026-10-01T08:00:00Z",
    });
    expect(rows[1]).toMatchObject({
      answer: "Contigs",
      correct_answer: "ASVs",
      status: "incorrect",
      number: 2,
      section: "Knowledge check",
    });
    expect(rows[2]).toMatchObject({
      answer: "",
      correct_answer: "",
      status: "blank",
      score: "50",
    });
  });

  it("keeps a written answer that contains a comma and a quote", () => {
    const rows = buildResponseExportRows({
      preId: "pre",
      postId: null,
      preQuestions: questions,
      postQuestions: [],
      responses: [
        response({
          answers: { open: 'Hello, she said "hi"' },
          score: null,
        }),
      ],
      usersById,
    });

    const written = rows.find((row) => row.type === "text");
    expect(written?.answer).toBe('Hello, she said "hi"');
    expect(toCsv(rows)).toContain('"Hello, she said ""hi"""');
  });

  it("omits a test the person did not submit and ignores an older response", () => {
    const rows = buildResponseExportRows({
      preId: "pre",
      postId: "post",
      preQuestions: questions,
      postQuestions: questions,
      responses: [
        response({
          id: "old",
          answers: { k1: 0 },
          score: 0,
          submitted_at: "2026-10-01T08:00:00Z",
        }),
        response({
          id: "new",
          answers: { k1: 1 },
          score: 100,
          submitted_at: "2026-10-02T08:00:00Z",
        }),
        response({
          id: "cleared-post",
          assessment_id: "post",
          answers: {},
          score: null,
          submitted_at: "2026-10-03T08:00:00Z",
        }),
        response({
          id: "other",
          participant_id: "u2",
          assessment_id: "post",
          answers: { k1: 1 },
          score: 100,
          submitted_at: "2026-09-01T08:00:00Z",
        }),
      ],
      usersById,
    });

    expect(rows.every((row) => row.test === "pre_test" || row.name === "Ben Cruz")).toBe(
      true,
    );
    expect(rows.filter((row) => row.name === "Ada Lovelace").every((row) => row.test === "pre_test")).toBe(true);
    expect(rows.find((row) => row.name === "Ada Lovelace" && row.question.startsWith("What is 16S"))).toMatchObject({
      answer: "Bacteria",
      status: "correct",
      score: "100",
      submitted_at: "2026-10-02T08:00:00Z",
    });
    expect(rows.filter((row) => row.name === "Ben Cruz").every((row) => row.test === "post_test")).toBe(true);
    expect(rows.map((row) => row.name).indexOf("Ada Lovelace")).toBeLessThan(
      rows.map((row) => row.name).indexOf("Ben Cruz"),
    );
  });

  it("can limit the file to one learner", () => {
    const rows = buildResponseExportRows({
      preId: "pre",
      postId: "post",
      preQuestions: questions,
      postQuestions: [],
      responses: [
        response({ answers: { k1: 1 }, score: 100 }),
        response({
          id: "other",
          participant_id: "u2",
          answers: { k1: 0 },
          score: 0,
        }),
      ],
      usersById,
      participantId: "u2",
    });

    expect(new Set(rows.map((row) => row.name))).toEqual(new Set(["Ben Cruz"]));
  });
});

describe("toCsv", () => {
  it("quotes fields that contain commas, quotes, or line breaks", () => {
    const csv = toCsv([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        institution: "PGCV, Diliman",
        test: "pre_test",
        section: "Notes",
        number: 1,
        question: 'Say "hello"',
        type: "text",
        answer: "Line one\nLine two",
        correct_answer: "",
        status: "answered",
        score: "",
        submitted_at: "2026-10-01T08:00:00Z",
      },
    ]);

    expect(csv.startsWith("name,email,institution,test,section,number,question,type,answer,correct_answer,status,score,submitted_at\r\n")).toBe(true);
    expect(csv).toContain('"PGCV, Diliman"');
    expect(csv).toContain('"Say ""hello"""');
    expect(csv).toContain('"Line one\nLine two"');
  });
});

describe("responseExportFileName", () => {
  const date = new Date(2026, 9, 15);

  it("names the full export by date", () => {
    expect(responseExportFileName({ date })).toBe(
      "pre-post-responses-2026-10-15.csv",
    );
  });

  it("slugs one learner's name into the filename", () => {
    expect(
      responseExportFileName({ participantName: "Ada Lovelace", date }),
    ).toBe("pre-post-responses-ada-lovelace-2026-10-15.csv");
  });
});
