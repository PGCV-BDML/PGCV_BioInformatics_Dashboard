import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProgramEvaluationForm from "./program-evaluation-form";
import { ensureProgramEvaluation } from "@/lib/program-evaluation";
import { getCurrentUser, getRowsFromDB, saveDataToDB } from "@/lib/supabase";
import type { Assessment } from "@/types/database";

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

vi.mock("@/lib/program-evaluation", () => ({
  ensureProgramEvaluation: vi.fn(),
}));

// Skip filling in every required question; the form's own validation is
// covered in lib/evaluation-form.test.ts.
vi.mock("@/lib/evaluation-form", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/evaluation-form")>()),
  missingRequiredAnswers: () => [],
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getCurrentUser: vi.fn(),
  saveDataToDB: vi.fn(),
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  },
}));

function evaluation(isOpen: boolean): Assessment {
  return {
    id: "eval-1",
    program_id: "prog-1",
    type: "evaluation",
    questions: [],
    is_open: isOpen,
  };
}

function mockResponses(answers: Record<string, unknown> | null) {
  vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
    if (table === "assessment_response" && answers) {
      return [
        {
          id: "resp-1",
          assessment_id: "eval-1",
          participant_id: "user-1",
          answers,
          score: null,
          submitted_at: "2026-10-10T01:00:00Z",
        },
      ] as never;
    }
    return [] as never;
  });
}

// Submit the form directly: the blank required inputs would otherwise stop
// jsdom's native validation from firing the submit.
async function submitEvaluation() {
  const button = await screen.findByRole("button", { name: "Submit Evaluation" });
  fireEvent.submit(button.closest("form")!);
}

describe("ProgramEvaluationForm (learner)", () => {
  beforeEach(() => {
    showToast.mockClear();
    vi.mocked(ensureProgramEvaluation).mockReset();
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(saveDataToDB).mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      user_metadata: {},
    } as never);
    mockResponses(null);
  });

  it("shows a locked card while the evaluation is closed", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue(evaluation(false));
    render(<ProgramEvaluationForm programId="prog-1" programType="training" />);

    expect(await screen.findByText("Evaluation Not Open Yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit Evaluation" }),
    ).not.toBeInTheDocument();
  });

  it("shows the thank-you card to a learner who already submitted", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue(evaluation(true));
    mockResponses({ suggestions: "More hands-on exercises" });
    render(<ProgramEvaluationForm programId="prog-1" programType="training" />);

    expect(await screen.findByText("Evaluation Submitted")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit Evaluation" }),
    ).not.toBeInTheDocument();
  });

  it("lets a learner submit again after staff cleared their evaluation", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue(evaluation(true));
    mockResponses({});
    render(<ProgramEvaluationForm programId="prog-1" programType="training" />);

    expect(
      await screen.findByRole("button", { name: "Submit Evaluation" }),
    ).toBeInTheDocument();
  });

  it("submits the evaluation without creating a certificate", async () => {
    vi.mocked(ensureProgramEvaluation).mockResolvedValue(evaluation(true));
    vi.mocked(saveDataToDB).mockResolvedValue(undefined as never);
    render(<ProgramEvaluationForm programId="prog-1" programType="training" />);

    await submitEvaluation();

    expect(
      await screen.findByText(/will release your certificate/),
    ).toBeInTheDocument();
    expect(saveDataToDB).toHaveBeenCalledTimes(1);
    expect(saveDataToDB).toHaveBeenCalledWith(
      "assessment_response",
      expect.any(String),
      expect.objectContaining({
        assessment_id: "eval-1",
        participant_id: "user-1",
      }),
    );
  });

  it("explains that the evaluation was closed when a submit is rejected", async () => {
    vi.mocked(ensureProgramEvaluation)
      .mockResolvedValueOnce(evaluation(true))
      .mockResolvedValueOnce(evaluation(false));
    vi.mocked(saveDataToDB).mockRejectedValue(
      new Error("new row violates row-level security policy"),
    );
    render(<ProgramEvaluationForm programId="prog-1" programType="training" />);

    await submitEvaluation();

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        "The evaluation has been closed by the training team. Please contact them if you think this is a mistake.",
        "error",
      );
    });
    expect(screen.getByText("Evaluation Not Open Yet")).toBeInTheDocument();
  });
});
