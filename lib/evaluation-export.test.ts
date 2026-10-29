import { describe, expect, it } from "vitest";
import { toCsvTable } from "./assessment-export";
import type { PostActivityQuestion } from "./evaluation-form";
import {
  buildEvaluationExportTable,
  evaluationExportFileName,
} from "./evaluation-export";
import type { EvaluationResponseInput } from "./evaluation-summary";

const questions: PostActivityQuestion[] = [
  { type: "text", id: "eval_full_name", question: "Full Name" },
  { type: "text", id: "eval_institution", question: "Institution" },
  {
    type: "rating_group",
    id: "eval_topics",
    question: "Topics / Content and Methods",
    allowNA: true,
    statements: [
      { id: "eval_topics_usefulness", statement: "Usefulness and relevance" },
      {
        id: "eval_topics_pacing",
        statement: "Course length, pacing, and time for questions",
      },
    ],
  },
  {
    type: "choice",
    id: "eval_attendance_reason",
    question: "Why did you attend this activity?",
    options: ["Required", "Invited"],
  },
  {
    type: "text",
    id: "eval_comments",
    question: "Overall comments on the activity:",
    multiline: true,
  },
];

function response(
  overrides: Partial<EvaluationResponseInput>,
): EvaluationResponseInput {
  return {
    participant_id: "u1",
    answers: {},
    submitted_at: "2026-10-20T08:00:00Z",
    ...overrides,
  };
}

describe("buildEvaluationExportTable", () => {
  it("writes one row per trainee with a column for each rating statement", () => {
    const table = buildEvaluationExportTable({
      questions,
      responses: [
        response({
          answers: {
            eval_full_name: "Ada Lovelace",
            eval_institution: "PGCV",
            eval_topics: { eval_topics_usefulness: 5, eval_topics_pacing: "N/A" },
            eval_attendance_reason: "Invited",
            eval_comments: "Great, thank you!",
          },
        }),
      ],
    });

    expect(table.header).toEqual([
      "Full Name",
      "Submitted At",
      "Institution",
      "Topics / Content and Methods — Usefulness and relevance",
      "Topics / Content and Methods — Course length, pacing, and time for questions",
      "Why did you attend this activity?",
      "Overall comments on the activity:",
    ]);
    expect(table.rows).toEqual([
      [
        "Ada Lovelace",
        "2026-10-20T08:00:00Z",
        "PGCV",
        "5",
        "N/A",
        "Invited",
        "Great, thank you!",
      ],
    ]);
  });

  it("reads older flat ratings and leaves unanswered cells blank", () => {
    const table = buildEvaluationExportTable({
      questions,
      responses: [
        response({
          answers: { eval_full_name: "Ben Cruz", eval_topics_usefulness: "4" },
        }),
      ],
    });

    expect(table.rows[0]).toEqual([
      "Ben Cruz",
      "2026-10-20T08:00:00Z",
      "",
      "4",
      "",
      "",
      "",
    ]);
  });

  it("skips cleared responses, sorts by name, and falls back to the account name", () => {
    const table = buildEvaluationExportTable({
      questions,
      nameByUserId: { u2: "Carla Reyes" },
      responses: [
        response({ participant_id: "u1", answers: { eval_full_name: "Ben Cruz" } }),
        response({ participant_id: "u2", answers: { eval_institution: "UP" } }),
        response({ participant_id: "u3", answers: {} }),
        response({ participant_id: "u4", answers: null }),
        response({ participant_id: "u5", answers: { eval_full_name: "Ada Lovelace" } }),
      ],
    });

    expect(table.rows.map((row) => row[0])).toEqual([
      "Ada Lovelace",
      "Ben Cruz",
      "Carla Reyes",
    ]);
  });

  it("quotes headers and comments that contain commas, quotes, or line breaks", () => {
    const { header, rows } = buildEvaluationExportTable({
      questions,
      responses: [
        response({
          answers: {
            eval_full_name: "Ada Lovelace",
            eval_comments: 'More "hands-on", please\nand longer breaks',
          },
        }),
      ],
    });
    const csv = toCsvTable(header, rows);

    expect(csv).toContain(
      '"Topics / Content and Methods — Course length, pacing, and time for questions"',
    );
    expect(csv).toContain('"More ""hands-on"", please\nand longer breaks"');
  });
});

describe("evaluationExportFileName", () => {
  const date = new Date(2026, 9, 29);

  it("puts the training title in the filename", () => {
    expect(
      evaluationExportFileName({
        programTitle: "16S rRNA Metagenomics Training",
        date,
      }),
    ).toBe("evaluation-responses-16s-rrna-metagenomics-training-2026-10-29.csv");
  });

  it("names the file by date when the title is missing", () => {
    expect(evaluationExportFileName({ programTitle: null, date })).toBe(
      "evaluation-responses-2026-10-29.csv",
    );
  });
});
