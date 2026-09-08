import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  INTRO_BIOINFORMATICS_KNOWLEDGE_ANSWER_KEY,
  INTRO_BIOINFORMATICS_POST_QUESTIONS,
  INTRO_BIOINFORMATICS_PRE_QUESTIONS,
} from "./intro-bioinformatics-assessments";
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

describe("Introduction to Bioinformatics pre/post tests", () => {
  it("omits participant code and uses the published answer key", () => {
    const blob = JSON.stringify({
      pre: INTRO_BIOINFORMATICS_PRE_QUESTIONS,
      post: INTRO_BIOINFORMATICS_POST_QUESTIONS,
    });
    expect(blob.toLowerCase()).not.toContain("participant code");
    expect(INTRO_BIOINFORMATICS_KNOWLEDGE_ANSWER_KEY).toEqual([
      2, 0, 1, 3, 2, 0, 1, 3, 0, 2,
    ]);
    expect(
      INTRO_BIOINFORMATICS_PRE_QUESTIONS.filter(
        (question) => question.type === "mcq",
      ),
    ).toHaveLength(10);
    expect(
      INTRO_BIOINFORMATICS_POST_QUESTIONS.filter(
        (question) => question.type === "mcq",
      ),
    ).toHaveLength(10);
  });

  it("repeats the same knowledge questions on the post-test", () => {
    const preKnowledge = INTRO_BIOINFORMATICS_PRE_QUESTIONS.filter(
      (question) => question.type === "mcq",
    );
    const postKnowledge = INTRO_BIOINFORMATICS_POST_QUESTIONS.filter(
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
      intro_pre_role: "Undergraduate student",
      intro_pre_skills: ["Navigating directories with `pwd`, `ls`, or `cd`"],
    };
    for (const question of INTRO_BIOINFORMATICS_PRE_QUESTIONS) {
      if (question.type === "mcq") answers[question.id] = question.correct;
    }
    expect(scoreMcqPercent(INTRO_BIOINFORMATICS_PRE_QUESTIONS, answers)).toBe(
      100,
    );
    answers["intro_pre_k1"] = 4;
    expect(scoreMcqPercent(INTRO_BIOINFORMATICS_PRE_QUESTIONS, answers)).toBe(
      90,
    );
  });

  it("keeps the replacement migration in sync", () => {
    const sql = readFileSync(
      "supabase/migrations/20260908120000_replace_intro_bioinformatics_assessments.sql",
      "utf8",
    );
    expect(extractDollarJson(sql, "pre")).toEqual(
      INTRO_BIOINFORMATICS_PRE_QUESTIONS,
    );
    expect(extractDollarJson(sql, "post")).toEqual(
      INTRO_BIOINFORMATICS_POST_QUESTIONS,
    );
  });

  it("keeps the draft JSON in sync", () => {
    const draft = JSON.parse(
      readFileSync(
        "supabase/drafts/intro_bioinformatics_assessments.json",
        "utf8",
      ),
    ) as { pre_test: unknown; post_test: unknown };
    expect(draft.pre_test).toEqual(INTRO_BIOINFORMATICS_PRE_QUESTIONS);
    expect(draft.post_test).toEqual(INTRO_BIOINFORMATICS_POST_QUESTIONS);
  });
});
