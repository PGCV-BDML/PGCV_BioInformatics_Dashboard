import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ParticipantAssessmentAnswers from "./participant-assessment-answers";
import * as assessmentExport from "@/lib/assessment-export";
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
      let rows = (tables[table] ?? []) as Record<string, unknown>[];
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: (column: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[column]));
          return chain;
        },
        then: (
          resolve: (value: { data: unknown[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
      };
      return chain;
    },
  },
}));

vi.mock("@/lib/user-names", () => ({
  loadUserProfiles: async () =>
    new Map([
      ["u-ada", { name: "Ada Lovelace", email: "ada@example.com", institution: "PGCV" }],
      ["u-ben", { name: "Ben Cruz", email: "ben@example.com", institution: "UP" }],
      ["u-cy", { name: "Cy Reyes", email: null, institution: null }],
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

  it("shows one intern's scores, answers and pre vs post comparison", async () => {
    render(
      <ParticipantAssessmentAnswers
        programId="prog-1"
        programType="internship"
        participantId="u-ben"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Ben Cruz" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pre \/ post test answers · Intern 2 of 3/)).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();

    expect(screen.getByText("Knowledge check: 0/1 before → 1/1 after")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("2 / 5")).toBeInTheDocument();
    expect(within(table).getByText("4 / 5")).toBeInTheDocument();
    expect(within(table).getByText("+2 pts")).toBeInTheDocument();

    expect(screen.getByText("Why Linux?")).toBeInTheDocument();
    expect(screen.getAllByText("Correct answer: pwd")).toHaveLength(1);
    expect(screen.getAllByLabelText("Incorrect").length).toBeGreaterThan(0);

    const download = vi
      .spyOn(assessmentExport, "downloadCsv")
      .mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "This learner" }));
    expect(download).toHaveBeenCalledOnce();
    const [learnerFile, learnerCsv] = download.mock.calls[0]!;
    expect(learnerFile).toMatch(/^pre-post-responses-ben-cruz-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(learnerCsv).toContain("Ben Cruz");
    expect(learnerCsv).not.toContain("Ada Lovelace");

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "All responses" }));
    const [, allCsv] = download.mock.calls[1]!;
    expect(allCsv).toContain("Ada Lovelace");
    expect(allCsv).toContain("Cy Reyes");
    download.mockRestore();
  });

  it("shows only the pre-test on a training and leaves old post-test answers out", async () => {
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
    // Cy only took the post-test, so they drop out of the trainee list.
    expect(screen.getByText(/Pre-test answers · Trainee 2 of 2/)).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Cy Reyes" })).not.toBeInTheDocument();
    expect(screen.getByText("Pre-test score")).toBeInTheDocument();
    expect(screen.getByText("Pre-Test")).toBeInTheDocument();
    expect(screen.getByText("Why Linux?")).toBeInTheDocument();
    expect(screen.queryByText("Post-test score")).not.toBeInTheDocument();
    expect(screen.queryByText("Gain")).not.toBeInTheDocument();
    expect(screen.queryByText("Post-Test")).not.toBeInTheDocument();
    expect(screen.queryByText("Pre vs Post")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const download = vi
      .spyOn(assessmentExport, "downloadCsv")
      .mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "All responses" }));
    const [file, csv] = download.mock.calls[0]!;
    expect(file).toMatch(/^pre-test-responses-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("pre_test");
    expect(csv).not.toContain("post_test");
    expect(csv).not.toContain("Cy Reyes");
    download.mockRestore();
  });

  it("links to the previous and next trainee by name", async () => {
    tables.assessment_response!.push(
      response("r5", "u-cy", "pre", { pre_k1: 1 }, 100),
    );
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
