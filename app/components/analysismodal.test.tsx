import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AnalysisSidebar, { EMPTY_ANALYSIS_FORM } from "./analysismodal";

const baseProps = {
  isOpen: true,
  formState: EMPTY_ANALYSIS_FORM,
  availableProjects: [],
  availableAssignees: [],
  availableReviewers: [],
  availableApprovers: [],
  pendingFile: null,
  onPendingFileChange: () => undefined,
  onClose: () => undefined,
  onChange: () => undefined,
  onSubmit: vi.fn(),
};

describe("AnalysisSidebar status of submission", () => {
  it("warns not to set Status of Submission when creating a record", () => {
    render(<AnalysisSidebar {...baseProps} />);

    expect(
      screen.getByText(/Do not set Status of Submission when creating a record/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Leave blank\. Filled in automatically after the reviewing officer completes review\./),
    ).toBeInTheDocument();
  });

  it("explains automatic stages and Submitted when editing", () => {
    render(
      <AnalysisSidebar
        {...baseProps}
        isEditing
        formState={{
          ...EMPTY_ANALYSIS_FORM,
          service_report_number: "PGCV-BIOINFO-SR-2026-001",
        }}
      />,
    );

    expect(
      screen.queryByText(/Do not set Status of Submission when creating a record/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /For approval, Under review, and Approved are set by the reviewing and approving officers/,
      ),
    ).toBeInTheDocument();
  });
});
