import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewCommentsModal from "./review-comments-modal";

vi.mock("./review-comments-panel", () => ({
  default: () => <div>Review comments</div>,
}));

vi.mock("./service-report-replace", () => ({
  default: () => <div>Replace report</div>,
}));

vi.mock("./service-report-versions", () => ({
  default: () => <div>Previous versions</div>,
}));

describe("ReviewCommentsModal", () => {
  it("lets the assignee replace an approved report so review can restart", () => {
    render(
      <ReviewCommentsModal
        row={{
          id: "a-1",
          label: "PGCV-BIOINFO-SR-2026-001",
          status_of_review: "Reviewed",
          status_of_submission: "Approved",
          service_report_file_path: "a-1/report.pdf",
          service_report_file_name: "report.pdf",
        }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Replace report")).toBeInTheDocument();
  });

  it("hides replace when the report is still in first review", () => {
    render(
      <ReviewCommentsModal
        row={{
          id: "a-1",
          label: "PGCV-BIOINFO-SR-2026-002",
          status_of_review: "For review",
          status_of_submission: "",
          service_report_file_path: "a-1/report.pdf",
          service_report_file_name: "report.pdf",
        }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Replace report")).not.toBeInTheDocument();
  });
});
