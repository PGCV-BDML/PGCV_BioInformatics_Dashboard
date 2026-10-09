import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramAssessment from "./program-assessment";
import { getCurrentUser, getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import { SIXTEEN_S_PRE_QUESTIONS } from "@/lib/16s-assessments";
import {
  INTRO_BIOINFORMATICS_POST_QUESTIONS,
  INTRO_BIOINFORMATICS_PRE_QUESTIONS,
} from "@/lib/intro-bioinformatics-assessments";

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

  it("renders the Introduction to Bioinformatics pre-test without a participant code", async () => {
    vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
      if (table === "assessment") {
        return [
          {
            id: "pre-id",
            program_id: "prog-1",
            type: "pre_test",
            questions: INTRO_BIOINFORMATICS_PRE_QUESTIONS,
          },
          {
            id: "post-id",
            program_id: "prog-1",
            type: "post_test",
            questions: INTRO_BIOINFORMATICS_POST_QUESTIONS,
          },
        ] as never;
      }
      return [] as never;
    });

    const user = userEvent.setup();
    render(<ProgramAssessment programId="prog-1" programType="training" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Pre-Test" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("Suggested time: 10 minutes.")).toHaveLength(2);
    expect(
      screen.getByText(/Your dashboard account identifies you/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/participant code/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start Pre-Test" }));

    expect(screen.getByText("Getting to know you")).toBeInTheDocument();
    expect(screen.getByText("Knowledge check")).toBeInTheDocument();
    expect(
      screen.getByText(/Which command-line skills have you used before/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Why is the command line especially useful/),
    ).toBeInTheDocument();
  });

  it("hides closed tests and locks submitted ones", async () => {
    vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
      if (table === "assessment") {
        return [
          {
            id: "pre-id",
            program_id: "prog-1",
            type: "pre_test",
            is_open: true,
            questions: INTRO_BIOINFORMATICS_PRE_QUESTIONS,
          },
          {
            id: "post-id",
            program_id: "prog-1",
            type: "post_test",
            is_open: false,
            questions: INTRO_BIOINFORMATICS_POST_QUESTIONS,
          },
        ] as never;
      }
      return [
        {
          id: "resp-1",
          assessment_id: "pre-id",
          participant_id: "user-1",
          answers: {},
          score: 40,
          submitted_at: "2026-10-01T00:00:00Z",
        },
      ] as never;
    });

    render(<ProgramAssessment programId="prog-1" programType="training" />);

    await waitFor(() => {
      expect(screen.getByText(/Submitted · Score 40%/)).toBeInTheDocument();
    });
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start/ })).not.toBeInTheDocument();
  });

  it("shows a review step before the final submit", async () => {
    const user = userEvent.setup();
    render(<ProgramAssessment programId="prog-1" programType="training" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start Pre-Test" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Start Pre-Test" }));
    await user.click(screen.getByRole("checkbox", { name: "QIIME 2" }));
    await user.click(screen.getByRole("button", { name: "Review Answers" }));

    expect(screen.getByText("Review your answers")).toBeInTheDocument();
    expect(screen.getByText("QIIME 2")).toBeInTheDocument();
    expect(saveDataToDB).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Edit Answers" }));
    expect(screen.getByRole("checkbox", { name: "QIIME 2" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Review Answers" }));
    await user.click(screen.getByRole("button", { name: "Submit Final Answers" }));

    await waitFor(() => {
      expect(screen.getByText("Assessment Submitted")).toBeInTheDocument();
    });
    expect(saveDataToDB).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveDataToDB).mock.calls[0]?.[2]).toMatchObject({
      assessment_id: "pre-id",
      participant_id: "user-1",
    });

    await user.click(screen.getByRole("button", { name: "Return to tests" }));
    expect(screen.getByText(/Submitted · Score/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Pre-Test" }),
    ).not.toBeInTheDocument();
  });
});
