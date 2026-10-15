import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProgramAssessmentSummary from "./program-assessment-summary";
import * as assessmentExport from "@/lib/assessment-export";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getUsersFromDB: vi.fn(),
  saveDataToDB: vi.fn(),
  supabase: {},
}));

describe("ProgramAssessmentSummary", () => {
  it("links each participant to their individual answers", async () => {
    vi.mocked(getUsersFromDB).mockResolvedValue([
      {
        id: "u-ada",
        name: "Ada Lovelace",
        email: "ada@example.com",
        institution: "PGCV",
      },
    ] as never);
    vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
      if (table === "assessment") {
        return [
          {
            id: "pre",
            program_id: "prog-1",
            type: "pre_test",
            questions: [
              {
                type: "mcq",
                id: "k1",
                question: "Which command prints the working directory?",
                options: ["ls", "pwd"],
                correct: 1,
              },
            ],
          },
        ] as never;
      }
      if (table === "assessment_response") {
        return [
          {
            id: "r1",
            assessment_id: "pre",
            participant_id: "u-ada",
            answers: { k1: 1 },
            score: 100,
            submitted_at: "2026-10-01T01:00:00Z",
          },
        ] as never;
      }
      return [] as never;
    });

    render(<ProgramAssessmentSummary programId="prog-1" programType="internship" />);

    expect(
      await screen.findByRole("link", { name: "Ada Lovelace" }),
    ).toHaveAttribute("href", "/dashboard/internship/prog-1/assessment/u-ada");
    expect(
      screen.getByRole("link", { name: "View Ada Lovelace's answers" }),
    ).toHaveAttribute("href", "/dashboard/internship/prog-1/assessment/u-ada");

    const download = vi
      .spyOn(assessmentExport, "downloadCsv")
      .mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Download all" }));
    expect(download).toHaveBeenCalledOnce();
    const [filename, csv] = download.mock.calls[0]!;
    expect(filename).toMatch(/^pre-post-responses-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("Ada Lovelace");
    expect(csv).toContain("ada@example.com");
    expect(csv).toContain("pwd");
    download.mockRestore();
  });
});
