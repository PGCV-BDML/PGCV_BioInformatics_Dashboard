import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramAssessment from "./program-assessment";
import { getCurrentUser, getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import { SIXTEEN_S_PRE_QUESTIONS } from "@/lib/16s-assessments";

vi.mock("./portal-context", () => ({
  usePortal: () => ({
    isStaff: false,
    isLearnerView: false,
    loading: false,
  }),
}));

const showToast = vi.fn();
vi.mock("./toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getCurrentUser: vi.fn(),
  saveDataToDB: vi.fn(),
}));

describe("ProgramAssessment", () => {
  beforeEach(() => {
    showToast.mockClear();
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(saveDataToDB).mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      name: "Ada",
      role: "trainee",
    } as never);
    vi.mocked(saveDataToDB).mockResolvedValue(undefined as never);
    vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
      if (table === "assessment") {
        return [
          {
            id: "pre-id",
            program_id: "prog-1",
            type: "pre_test",
            questions: SIXTEEN_S_PRE_QUESTIONS,
          },
          {
            id: "post-id",
            program_id: "prog-1",
            type: "post_test",
            questions: [],
          },
        ] as never;
      }
      return [] as never;
    });
  });

  it("renders the 16S pre-test without a participant code field", async () => {
    const user = userEvent.setup();
    render(<ProgramAssessment programId="prog-1" programType="training" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Pre-Test" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Start Pre-Test" }));

    expect(screen.getByText("Getting to know you")).toBeInTheDocument();
    expect(screen.getByText("Knowledge check")).toBeInTheDocument();
    expect(
      screen.getByText(/Which tools have you used before/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/participant code/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "QIIME 2" }));
    await user.click(screen.getByRole("checkbox", { name: "None of these" }));
    expect(screen.getByRole("checkbox", { name: "QIIME 2" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "None of these" })).toBeChecked();
  });
});
