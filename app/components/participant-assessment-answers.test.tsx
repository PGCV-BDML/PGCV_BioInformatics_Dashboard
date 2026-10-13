import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import ParticipantAssessmentAnswers from "./participant-assessment-answers";
import type { Question } from "@/types/database";

const { tables, portal, router } = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  portal: { isStaff: true, isLearnerView: false, loading: false },
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("./portal-context", () => ({
  usePortal: () => portal,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const result = Promise.resolve({ data: tables[table] ?? [], error: null });
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        then: result.then.bind(result),
      };
      return chain;
    },
  },
}));

vi.mock("@/lib/user-names", () => ({
  loadUserNameMap: async () =>
    new Map([
      ["u-ada", "Ada Lovelace"],
      ["u-ben", "Ben Cruz"],
      ["u-cy", "Cy Reyes"],
    ]),
}));

const preQuestions: Question[] = [
  {
    type: "rating",
    id: "pre_conf",
    question: "How confident are you with the terminal?",
    scale: 5,
    section: "Current confidence",
  },
  {
    type: "mcq",
    id: "pre_k1",
    question: "Which command prints the working directory?",
    options: ["ls", "pwd"],
    correct: 1,
    section: "Knowledge check",
  },
  {
    type: "text",
    id: "pre_open",
    question: "What is your biggest question?",
  },
];

const postQuestions: Question[] = [
  {
    type: "mcq",
    id: "post_k1",
    question: "Which command prints the working directory?",
    options: ["ls", "pwd"],
    correct: 1,
    section: "Knowledge check",
  },
  {
    type: "rating",
    id: "post_conf",
    question: "How confident are you with the terminal?",
    scale: 5,
  },
];

function response(
  id: string,
  participant: string,
  assessment: "pre" | "post",
  answers: Record<string, unknown>,
  score: number,
) {
  return {
    id,
    assessment_id: assessment,
    participant_id: participant,
    answers,
    score,
    submitted_at: assessment === "pre" ? "2026-10-01T01:00:00Z" : "2026-10-03T01:00:00Z",
  };
}

describe("ParticipantAssessmentAnswers", () => {
  beforeEach(() => {
    portal.isStaff = true;
    portal.isLearnerView = false;
    router.replace.mockReset();
    router.push.mockReset();
    tables.assessment = [
      { id: "pre", type: "pre_test", questions: preQuestions },
      { id: "post", type: "post_test", questions: postQuestions },
    ];
    tables.assessment_response = [
      response("r1", "u-ben", "pre", { pre_conf: 2, pre_k1: 0, pre_open: "Why Linux?" }, 0),
      response("r2", "u-ben", "post", { post_k1: 1, post_conf: 4 }, 100),
      response("r3", "u-ada", "pre", { pre_k1: 1 }, 100),
      response("r4", "u-cy", "post", { post_k1: 0 }, 0),
    ];
  });

  it("shows one trainee's scores, answers and pre vs post comparison", async () => {
    render(
      <ParticipantAssessmentAnswers
        programId="prog-1"
        programType="training"
        participantId="u-ben"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Ben Cruz" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Trainee 2 of 3/)).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();

    expect(screen.getByText("Knowledge check: 0/1 before → 1/1 after")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("2 / 5")).toBeInTheDocument();
    expect(within(table).getByText("4 / 5")).toBeInTheDocument();
    expect(within(table).getByText("+2 pts")).toBeInTheDocument();

    expect(screen.getByText("Why Linux?")).toBeInTheDocument();
    expect(screen.getAllByText("Correct answer: pwd")).toHaveLength(1);
    expect(screen.getAllByLabelText("Incorrect").length).toBeGreaterThan(0);
  });

  it("links to the previous and next trainee by name", async () => {
    render(
      <ParticipantAssessmentAnswers
        programId="prog-1"
        programType="training"
        participantId="u-ben"
      />,
    );

    expect(
      await screen.findByRole("link", { name: "Previous trainee: Ada Lovelace" }),
    ).toHaveAttribute("href", "/dashboard/training/prog-1/assessment/u-ada");
    expect(
      screen.getByRole("link", { name: "Next trainee: Cy Reyes" }),
    ).toHaveAttribute("href", "/dashboard/training/prog-1/assessment/u-cy");
    expect(screen.getByRole("link", { name: /Back to summary/ })).toHaveAttribute(
      "href",
      "/dashboard/training/prog-1/assessment",
    );
  });

  it("marks a test the trainee has not taken", async () => {
    render(
      <ParticipantAssessmentAnswers
        programId="prog-1"
        programType="internship"
        participantId="u-cy"
      />,
    );

    expect(await screen.findByText(/Intern 3 of 3/)).toBeInTheDocument();
    expect(screen.getByText("Not submitted yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains when the person has no answers", async () => {
    render(
      <ParticipantAssessmentAnswers
        programId="prog-1"
        programType="training"
        participantId="u-nobody"
      />,
    );

    expect(await screen.findByText("No test answers found")).toBeInTheDocument();
  });

  it("sends learners back to the tests tab", async () => {
    portal.isStaff = false;
    render(
      <ParticipantAssessmentAnswers
        programId="prog-1"
        programType="training"
        participantId="u-ben"
      />,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(
        "/dashboard/training/prog-1/assessment",
      );
    });
    expect(screen.queryByText("Ben Cruz")).not.toBeInTheDocument();
  });
});
