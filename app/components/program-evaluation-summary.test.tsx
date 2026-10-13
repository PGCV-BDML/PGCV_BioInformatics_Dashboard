import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
});
