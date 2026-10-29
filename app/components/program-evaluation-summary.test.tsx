import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramEvaluationSummary from "./program-evaluation-summary";
import * as assessmentExport from "@/lib/assessment-export";
import { ensureProgramEvaluation } from "@/lib/program-evaluation";
import { getRowsFromDB, getUsersFromDB, saveDataToDB } from "@/lib/supabase";

const showToast = vi.fn();
vi.mock("./toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/lib/program-evaluation", () => ({
  ensureProgramEvaluation: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getUsersFromDB: vi.fn(),
  saveDataToDB: vi.fn(),
  supabase: {},
}));

describe("ProgramEvaluationSummary", () => {
  it("lets staff open a closed evaluation", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue({
      id: "eval-1",
      program_id: "prog-1",
      type: "evaluation",
      questions: [],
      is_open: false,
    });
    vi.mocked(getRowsFromDB).mockResolvedValue([] as never);
    vi.mocked(getUsersFromDB).mockResolvedValue([] as never);
    vi.mocked(saveDataToDB).mockResolvedValue(undefined as never);
    const user = userEvent.setup();

    render(<ProgramEvaluationSummary programId="prog-1" programType="training" />);

    const toggle = await screen.findByRole("switch", {
      name: "Evaluation open for submissions",
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText("Closed: participants can't start it yet"),
    ).toBeInTheDocument();

    await user.click(toggle);

    expect(saveDataToDB).toHaveBeenCalledWith("assessment", "eval-1", {
      is_open: true,
    });
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
    expect(showToast).toHaveBeenCalledWith("Evaluation opened.", "success");
  });

  it("shows dashboard feedback apart from the activity ratings", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue({
      id: "eval-1",
      program_id: "prog-1",
      type: "evaluation",
      questions: [],
      is_open: true,
    });
    vi.mocked(getRowsFromDB).mockResolvedValue([
      {
        id: "resp-1",
        assessment_id: "eval-1",
        participant_id: "ada",
        submitted_at: "2026-10-10T01:00:00Z",
        score: null,
        answers: {
          eval_full_name: "Ada Lovelace",
          eval_overall: { eval_overall_quality: 5 },
          eval_dash_overall: { eval_dash_overall_experience: 2 },
          eval_dash_device: "Phone",
          eval_dash_issues: "Couldn't find the slides.",
        },
      },
      {
        id: "resp-2",
        assessment_id: "eval-1",
        participant_id: "grace",
        submitted_at: "2026-10-09T01:00:00Z",
        score: null,
        answers: {
          eval_full_name: "Grace Hopper",
          eval_overall: { eval_overall_quality: 3 },
        },
      },
    ] as never);
    vi.mocked(getUsersFromDB).mockResolvedValue([] as never);

    render(<ProgramEvaluationSummary programId="prog-1" programType="training" />);

    const dashboard = (await screen.findByText("Dashboard feedback")).closest(
      "div.space-y-5",
    ) as HTMLElement;
    expect(within(dashboard).getByText("of 2")).toBeInTheDocument();
    expect(
      within(dashboard).getByText("Couldn't find the slides."),
    ).toBeInTheDocument();

    const activityAverage = screen.getByText("Overall activity average")
      .parentElement as HTMLElement;
    expect(within(activityAverage).getByText("4.0")).toBeInTheDocument();
  });

  it("downloads the evaluation responses as a CSV named for the training", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue({
      id: "eval-1",
      program_id: "prog-1",
      type: "evaluation",
      questions: [],
      is_open: true,
    });
    vi.mocked(getRowsFromDB).mockImplementation((async (table: string) => {
      if (table === "training_program") {
        return [{ id: "prog-1", title: "16S rRNA Metagenomics Training" }];
      }
      return [
        {
          id: "resp-1",
          assessment_id: "eval-1",
          participant_id: "ada",
          submitted_at: "2026-10-10T01:00:00Z",
          score: null,
          answers: {
            eval_full_name: "Ada Lovelace",
            eval_overall: { eval_overall_quality: 5 },
            eval_comments: "Loved the QIIME 2 exercises.",
          },
        },
        {
          id: "resp-other",
          assessment_id: "eval-2",
          participant_id: "grace",
          submitted_at: "2026-10-09T01:00:00Z",
          score: null,
          answers: { eval_full_name: "Grace Hopper" },
        },
      ];
    }) as never);
    vi.mocked(getUsersFromDB).mockResolvedValue([] as never);
    const download = vi
      .spyOn(assessmentExport, "downloadCsv")
      .mockImplementation(() => {});
    const user = userEvent.setup();

    render(<ProgramEvaluationSummary programId="prog-1" programType="training" />);

    await user.click(await screen.findByRole("button", { name: "Download CSV" }));

    expect(download).toHaveBeenCalledOnce();
    const [filename, csv] = download.mock.calls[0]!;
    expect(filename).toMatch(
      /^evaluation-responses-16s-rrna-metagenomics-training-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(csv).toContain("Ada Lovelace");
    expect(csv).toContain("Loved the QIIME 2 exercises.");
    expect(csv).not.toContain("Grace Hopper");
    download.mockRestore();
  });
});
