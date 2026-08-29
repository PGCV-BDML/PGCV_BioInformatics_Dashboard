import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SIXTEEN_S_KNOWLEDGE_ANSWER_KEY,
  SIXTEEN_S_POST_QUESTIONS,
  SIXTEEN_S_PRE_QUESTIONS,
} from "./16s-assessments";
import { scoreMcqPercent } from "./assessment-form";

function extractDollarJson(sql: string, tag: string): unknown {
  const open = `$${tag}$`;
  const start = sql.indexOf(open);
  expect(start).toBeGreaterThan(-1);
  const jsonStart = start + open.length;
  const end = sql.indexOf(open, jsonStart);
  expect(end).toBeGreaterThan(jsonStart);
  return JSON.parse(sql.slice(jsonStart, end));
}

describe("16S pre/post tests", () => {
  it("omits participant code and uses the published answer key", () => {
    const blob = JSON.stringify({
      pre: SIXTEEN_S_PRE_QUESTIONS,
      post: SIXTEEN_S_POST_QUESTIONS,
    });
    expect(blob.toLowerCase()).not.toContain("participant code");
    expect(SIXTEEN_S_KNOWLEDGE_ANSWER_KEY).toEqual([
      1, 0, 2, 2, 1, 0, 1, 1, 1, 1,
    ]);
    expect(
      SIXTEEN_S_PRE_QUESTIONS.filter((question) => question.type === "mcq"),
    ).toHaveLength(10);
    expect(
      SIXTEEN_S_POST_QUESTIONS.filter((question) => question.type === "mcq"),
    ).toHaveLength(10);
  });

  it("repeats the same knowledge questions on the post-test", () => {
    const preKnowledge = SIXTEEN_S_PRE_QUESTIONS.filter(
      (question) => question.type === "mcq",
    );
    const postKnowledge = SIXTEEN_S_POST_QUESTIONS.filter(
      (question) => question.type === "mcq",
    );
    expect(
      postKnowledge.map(({ question, options, correct }) => ({
        question,
        options,
        correct,
      })),
    ).toEqual(
      preKnowledge.map(({ question, options, correct }) => ({
        question,
        options,
        correct,
      })),
    );
  });

  it("does not count background answers toward the knowledge score", () => {
    const answers: Record<string, unknown> = {
      "16s_pre_role": "Undergraduate student",
      "16s_pre_tools": ["QIIME 2"],
    };
    for (const question of SIXTEEN_S_PRE_QUESTIONS) {
      if (question.type === "mcq") answers[question.id] = question.correct;
    }
    expect(scoreMcqPercent(SIXTEEN_S_PRE_QUESTIONS, answers)).toBe(100);
    answers["16s_pre_k1"] = 4;
    expect(scoreMcqPercent(SIXTEEN_S_PRE_QUESTIONS, answers)).toBe(90);
  });

  it("keeps the replacement migration in sync", () => {
    const sql = readFileSync(
      "supabase/migrations/20260829150000_replace_16s_metabarcoding_assessments.sql",
      "utf8",
    );
    expect(extractDollarJson(sql, "pre")).toEqual(SIXTEEN_S_PRE_QUESTIONS);
    expect(extractDollarJson(sql, "post")).toEqual(SIXTEEN_S_POST_QUESTIONS);
  });

  it("keeps the draft JSON in sync", () => {
    const draft = JSON.parse(
      readFileSync("supabase/drafts/16s_metagenomics_assessments.json", "utf8"),
    ) as { pre_test: unknown; post_test: unknown };
    expect(draft.pre_test).toEqual(SIXTEEN_S_PRE_QUESTIONS);
    expect(draft.post_test).toEqual(SIXTEEN_S_POST_QUESTIONS);
  });
});
