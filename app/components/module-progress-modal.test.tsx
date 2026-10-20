import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ModuleProgressModal from "./module-progress-modal";
import type { ProgressSummary } from "@/lib/module-progress";

const summary: ProgressSummary = {
  done: 1,
  total: 2,
  items: [
    {
      id: "16s-marker",
      label: "Q1 · Why the 16S rRNA gene",
      done: true,
      evidence: "Answer: It combines conserved regions with variable regions",
      platform: null,
      completed_at: "2026-10-20T05:38:00.000Z",
      updated_at: "2026-10-20T05:38:00.000Z",
    },
    {
      id: "ngs-fastq",
      label: "Q3 · What a FASTQ file contains",
      done: false,
      evidence: "Answer: Sample descriptions only",
      platform: null,
      completed_at: null,
      updated_at: "2026-10-20T05:38:00.000Z",
    },
  ],
};

describe("ModuleProgressModal", () => {
  it("shows a submitted test as correct and incorrect answers", () => {
    render(
      <ModuleProgressModal
        isOpen
        participantName="A. Cruz"
        moduleTitle="Pre-Test for 16S rRNA Metagenomics Training"
        summary={summary}
        kind="quiz"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 of 2 correct/)).toBeInTheDocument();
    expect(screen.getByText(/Submitted/)).toBeInTheDocument();
    expect(screen.getByText("Q1 · Why the 16S rRNA gene")).toBeInTheDocument();
    expect(
      screen.getByText("It combines conserved regions with variable regions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sample descriptions only")).toBeInTheDocument();
    expect(screen.getByLabelText("Correct")).toBeInTheDocument();
    expect(screen.getByLabelText("Incorrect")).toBeInTheDocument();
    expect(screen.queryByText("Pasted output")).not.toBeInTheDocument();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
    expect(screen.queryByText(/of 2 done/)).not.toBeInTheDocument();
  });

  it("keeps setup modules on the step checklist", () => {
    render(
      <ModuleProgressModal
        isOpen
        participantName="A. Cruz"
        moduleTitle="Software Setup"
        summary={{
          done: 0,
          total: 1,
          items: [
            {
              id: "qiime2",
              label: "QIIME 2",
              done: false,
              evidence: "conda 26.1.1",
              platform: null,
              completed_at: null,
              updated_at: null,
            },
          ],
        }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/0 of 1 done/)).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Pasted output")).toBeInTheDocument();
  });

  it("says a quiz is not submitted until answers arrive", () => {
    render(
      <ModuleProgressModal
        isOpen
        participantName="A. Cruz"
        moduleTitle="Post-Test for 16S rRNA Metagenomics Training"
        summary={{
          done: 0,
          total: 1,
          items: [
            {
              id: "16s-marker",
              label: "Q1 · Why the 16S rRNA gene",
              done: false,
              evidence: null,
              platform: null,
              completed_at: null,
              updated_at: null,
            },
          ],
        }}
        kind="quiz"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Not submitted/)).toBeInTheDocument();
    expect(screen.queryByText("Q1 · Why the 16S rRNA gene")).not.toBeInTheDocument();
  });
});
