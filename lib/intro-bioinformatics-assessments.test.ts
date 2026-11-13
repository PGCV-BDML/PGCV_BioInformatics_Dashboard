import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  INTRO_BIOINFORMATICS_KNOWLEDGE_ANSWER_KEY,
  INTRO_BIOINFORMATICS_POST_QUESTIONS,
  INTRO_BIOINFORMATICS_PRE_QUESTIONS,
} from "./intro-bioinformatics-assessments";
import { hasScoredQuestions, scoreMcqPercent } from "./assessment-form";
import type { ChoiceQuestion } from "@/types/database";

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
      INTRO_BIOINFORMATICS_POST_QUESTIONS.filter(
        (question) => question.type === "mcq",
      ),
    ).toHaveLength(10);
  });

  it("makes the pre-test an ungraded survey in four parts", () => {
    const pre = INTRO_BIOINFORMATICS_PRE_QUESTIONS;
    expect(hasScoredQuestions(pre)).toBe(false);
    expect(pre).toHaveLength(30);
    expect(pre.filter((question) => question.section).map((q) => q.section)).toEqual([
      "Getting to know you",
      "Your experience with the training topics",
      "Current confidence",
      "Starting point",
    ]);
    expect(pre[0]?.sectionIntro).toMatch(/not graded/);
    expect(pre[0]?.sectionIntro).toMatch(/Suggested time: about 10 minutes\./);
    expect(pre.filter((question) => question.type === "rating")).toHaveLength(11);
    expect(
      pre.filter((question) => question.id.startsWith("intro_pre_exp")),
    ).toHaveLength(11);
    expect(new Set(pre.map((question) => question.id)).size).toBe(pre.length);
  });

  it("opens a text box for every Other option", () => {
    const withOther = INTRO_BIOINFORMATICS_PRE_QUESTIONS.filter(
      (question): question is ChoiceQuestion =>
        question.type === "choice" &&
        question.options.some((option) => option.startsWith("Other (")),
    );
    expect(withOther.map((question) => question.id)).toEqual([
      "intro_pre_role",
      "intro_pre_field",
      "intro_pre_plans",
      "intro_pre_tools",
    ]);
    for (const question of withOther) {
      expect(question.options).toContain(question.otherOption);
    }
  });

  it("does not score background answers on the pre-test", () => {
    const answers: Record<string, unknown> = {
      intro_pre_role: "Other (please specify)",
      intro_pre_role_other: "Medical technologist",
      intro_pre_tools: ["BLAST", "R or RStudio"],
      intro_pre_conf1: 3,
    };
    expect(scoreMcqPercent(INTRO_BIOINFORMATICS_PRE_QUESTIONS, answers)).toBe(0);
  });

  it("scores only the knowledge check on the post-test", () => {
    const answers: Record<string, unknown> = {
      intro_post_clearest: "Terminal concepts and command structure",
    };
    for (const question of INTRO_BIOINFORMATICS_POST_QUESTIONS) {
      if (question.type === "mcq") answers[question.id] = question.correct;
    }
    expect(scoreMcqPercent(INTRO_BIOINFORMATICS_POST_QUESTIONS, answers)).toBe(
      100,
    );
    answers["intro_post_k1"] = 4;
    expect(scoreMcqPercent(INTRO_BIOINFORMATICS_POST_QUESTIONS, answers)).toBe(
      90,
    );
  });

  it("keeps the migrations in sync", () => {
    const original = readFileSync(
      "supabase/migrations/20260908120000_replace_intro_bioinformatics_assessments.sql",
      "utf8",
    );
    expect(extractDollarJson(original, "post")).toEqual(
      INTRO_BIOINFORMATICS_POST_QUESTIONS,
    );
    const revisedPre = readFileSync(
      "supabase/migrations/20261113120000_revise_intro_bioinformatics_pretest.sql",
      "utf8",
    );
    expect(extractDollarJson(revisedPre, "pre")).toEqual(
      INTRO_BIOINFORMATICS_PRE_QUESTIONS,
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
