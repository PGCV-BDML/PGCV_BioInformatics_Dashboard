import { describe, expect, it } from "vitest";
import {
  asStringArray,
  formatAnswer,
  scoreMcqPercent,
  toggleMultiChoiceOption,
} from "./assessment-form";
import type { Question } from "@/types/database";

const questions: Question[] = [
  {
    type: "choice",
    id: "role",
    question: "Role?",
    options: ["Student", "Faculty"],
  },
  {
    type: "mcq",
    id: "k1",
    question: "pwd?",
    options: ["cd", "pwd", "I don't know yet"],
    correct: 1,
  },
  {
    type: "mcq",
    id: "k2",
    question: "FASTQ?",
    options: ["Names", "Reads and quality scores"],
    correct: 1,
  },
];

describe("scoreMcqPercent", () => {
  it("scores only MCQs", () => {
    expect(
      scoreMcqPercent(questions, { role: "Student", k1: 1, k2: 1 }),
    ).toBe(100);
    expect(scoreMcqPercent(questions, { role: "Student", k1: 2, k2: 0 })).toBe(
      0,
    );
    expect(scoreMcqPercent(questions, { k1: 1, k2: 0 })).toBe(50);
  });
});

describe("toggleMultiChoiceOption", () => {
  it("clears other tools when None of these is selected", () => {
    expect(
      toggleMultiChoiceOption(["QIIME 2", "phyloseq"], "None of these"),
    ).toEqual(["None of these"]);
    expect(toggleMultiChoiceOption(["None of these"], "None of these")).toEqual(
      [],
    );
    expect(toggleMultiChoiceOption(["None of these"], "QIIME 2")).toEqual([
      "QIIME 2",
    ]);
  });
});

describe("asStringArray", () => {
  it("ignores non-string payloads", () => {
    expect(asStringArray(["QIIME 2", 2, "R or RStudio"])).toEqual([
      "QIIME 2",
      "R or RStudio",
    ]);
    expect(asStringArray("QIIME 2")).toEqual([]);
  });
});

describe("formatAnswer", () => {
  it("formats each question type and flags blanks", () => {
    const [choice, mcq] = questions as [Question, Question];
    expect(formatAnswer(mcq, 1)).toBe("pwd");
    expect(formatAnswer(choice, "Faculty")).toBe("Faculty");
    expect(
      formatAnswer(
        { ...choice, multiple: true } as Question,
        ["Student", "Faculty"],
      ),
    ).toBe("Student, Faculty");
    expect(
      formatAnswer({ type: "rating", id: "r", question: "Rate", scale: 5 } as Question, 4),
    ).toBe("4 / 5");
    expect(
      formatAnswer({ type: "text", id: "t", question: "Why?" } as Question, "  "),
    ).toBeNull();
    expect(formatAnswer(mcq, undefined)).toBeNull();
  });
});
