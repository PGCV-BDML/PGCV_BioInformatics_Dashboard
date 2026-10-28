import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramEvaluationSummary from "./program-evaluation-summary";
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
});
