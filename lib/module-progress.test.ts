import { describe, expect, it } from "vitest";
import {
  MAX_EVIDENCE_LENGTH,
  checklistKindForModule,
  chosenAnswer,
  progressByUser,
  quizIsSubmitted,
  quizItemStatus,
  quizSubmittedAt,
  moduleStatus,
  overallProgress,
  sanitizeProgressItems,
  summarizeProgress,
} from "@/lib/module-progress";

const checklist = [
  { id: "terminal", label: "Terminal and project folder" },
  { id: "miniconda", label: "Miniconda" },
  { id: "qiime2", label: "QIIME 2" },
];

describe("sanitizeProgressItems", () => {
  it("keeps valid items and normalises their fields", () => {
    const items = sanitizeProgressItems([
      {
        item_id: "terminal",
        done: true,
        evidence: "* Ubuntu  Running  2",
        platform: "windows",
        completed_at: "2026-10-19T02:00:00Z",
      },
      { item_id: "miniconda", done: false, evidence: "conda 26.1.1", platform: "macos" },
    ]);
    expect(items).toEqual([
      {
        item_id: "terminal",
        done: true,
        evidence: "* Ubuntu  Running  2",
        platform: "windows",
        completed_at: "2026-10-19T02:00:00.000Z",
      },
      {
        item_id: "miniconda",
        done: false,
        evidence: "conda 26.1.1",
        platform: "macos",
        completed_at: null,
      },
    ]);
  });

  it("drops malformed and duplicate ids", () => {
    const items = sanitizeProgressItems([
      { item_id: "../users", done: true },
      { item_id: "", done: true },
      { item_id: 42, done: true },
      { item_id: "fastp", done: true },
      { item_id: "fastp", done: false },
      null,
    ]);
    expect(items.map((i) => [i.item_id, i.done])).toEqual([["fastp", true]]);
  });

  it("caps evidence, rejects unknown platforms and only dates done items", () => {
    const [item] = sanitizeProgressItems([
      {
        item_id: "r",
        done: false,
        evidence: "x".repeat(MAX_EVIDENCE_LENGTH + 50),
        platform: "android",
        completed_at: "2026-10-19T02:00:00Z",
      },
    ]);
    expect(item?.evidence).toHaveLength(MAX_EVIDENCE_LENGTH);
    expect(item?.platform).toBeNull();
    expect(item?.completed_at).toBeNull();
  });

  it("treats non-arrays, blank evidence and bad dates as empty", () => {
    expect(sanitizeProgressItems({ item_id: "r" })).toEqual([]);
    const [item] = sanitizeProgressItems([
      { item_id: "r", done: true, evidence: "   ", completed_at: "not a date" },
    ]);
    expect(item?.evidence).toBeNull();
    expect(item?.completed_at).toBeNull();
  });
});

describe("summarizeProgress", () => {
  it("follows checklist order and ignores items not on the checklist", () => {
    const summary = summarizeProgress(checklist, [
      { user_id: "u1", module_id: "m", item_id: "qiime2", done: true, platform: "linux" },
      { user_id: "u1", module_id: "m", item_id: "terminal", done: true },
      { user_id: "u1", module_id: "m", item_id: "retired-step", done: true },
    ]);
    expect(summary.done).toBe(2);
    expect(summary.total).toBe(3);
    expect(summary.items.map((i) => [i.id, i.done])).toEqual([
      ["terminal", true],
      ["miniconda", false],
      ["qiime2", true],
    ]);
    expect(summary.items[2]?.platform).toBe("linux");
  });
});

describe("progressByUser", () => {
  it("groups by learner for one module and fills in learners with no rows", () => {
    const rows = [
      { user_id: "u1", module_id: "nfdi-software-setup", item_id: "terminal", done: true },
      { user_id: "u1", module_id: "other-module", item_id: "miniconda", done: true },
      { user_id: "u2", module_id: "nfdi-software-setup", item_id: "miniconda", done: false },
    ];
    const result = progressByUser(rows, "nfdi-software-setup", checklist, ["u1", "u2", "u3"]);
    expect(result.get("u1")?.done).toBe(1);
    expect(result.get("u2")?.done).toBe(0);
    expect(result.get("u3")).toMatchObject({ done: 0, total: 3 });
  });
});

describe("quiz progress", () => {
  it("treats pre-test and post-test ids as quizzes, and an explicit kind either way", () => {
    expect(checklistKindForModule("nfrdi-pre-test")).toBe("quiz");
    expect(checklistKindForModule("nfrdi-post-test")).toBe("quiz");
    expect(checklistKindForModule("nfrdi-software-setup")).toBe("steps");
    expect(checklistKindForModule("custom-check", "quiz")).toBe("quiz");
  });

  it("reads a wrong answer as incorrect, not as an unfinished step", () => {
    const correct = {
      done: true,
      evidence: "Answer: It combines conserved regions with variable regions",
    };
    const wrong = { done: false, evidence: "Answer: Sample descriptions only" };
    const blank = { done: false, evidence: null };
    expect(chosenAnswer(correct.evidence)).toBe(
      "It combines conserved regions with variable regions",
    );
    expect(quizItemStatus(correct)).toBe("correct");
    expect(quizItemStatus(wrong)).toBe("incorrect");
    expect(quizItemStatus(blank)).toBe("unanswered");
    expect(quizIsSubmitted([blank])).toBe(false);
    expect(quizIsSubmitted([wrong, correct])).toBe(true);
    expect(
      quizSubmittedAt([
        { ...wrong, completed_at: null, updated_at: "2026-10-20T05:38:00.000Z" },
        {
          ...correct,
          completed_at: "2026-10-20T05:38:00.000Z",
          updated_at: "2026-10-20T05:38:00.000Z",
        },
      ]),
    ).toBe("2026-10-20T05:38:00.000Z");
  });
});

describe("moduleStatus", () => {
  const steps = (done: boolean[]) =>
    summarizeProgress(
      checklist,
      checklist.flatMap((item, i) =>
        done[i]
          ? [{ user_id: "u", module_id: "m", item_id: item.id, done: true }]
          : [],
      ),
    );

  it("reads step checklists by how many steps are done", () => {
    expect(moduleStatus(undefined, "steps")).toBe("not_started");
    expect(moduleStatus(steps([false, false, false]), "steps")).toBe("not_started");
    expect(moduleStatus(steps([true, false, false]), "steps")).toBe("in_progress");
    expect(moduleStatus(steps([true, true, true]), "steps")).toBe("complete");
  });

  it("treats any answered test as submitted", () => {
    const unanswered = summarizeProgress(checklist, []);
    expect(moduleStatus(unanswered, "quiz")).toBe("not_started");
    const partial = summarizeProgress(checklist, [
      { user_id: "u", module_id: "m", item_id: "terminal", done: false, evidence: "Answer: B" },
    ]);
    expect(moduleStatus(partial, "quiz")).toBe("submitted");
    expect(moduleStatus(steps([true, true, true]), "quiz")).toBe("complete");
  });
});

describe("overallProgress", () => {
  it("counts finished and started modules", () => {
    const done = summarizeProgress(checklist, [
      { user_id: "u", module_id: "a", item_id: "terminal", done: true },
      { user_id: "u", module_id: "a", item_id: "miniconda", done: true },
      { user_id: "u", module_id: "a", item_id: "qiime2", done: true },
    ]);
    const half = summarizeProgress(checklist, [
      { user_id: "u", module_id: "b", item_id: "terminal", done: true },
    ]);
    expect(
      overallProgress({ a: done, b: half }, [
        { id: "a", checklistKind: "steps" },
        { id: "b", checklistKind: "steps" },
        { id: "c", checklistKind: "quiz" },
      ]),
    ).toEqual({ finished: 1, started: 1, total: 3 });
  });
});
