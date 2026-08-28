import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import ServiceReportReplace from "./service-report-replace";

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  getCurrentUser: vi.fn(),
  saveDataToDB: vi.fn(),
}));

vi.mock("@/lib/service-report-file", () => ({
  uploadServiceReportPdf: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  resubmitForApproval: vi.fn(),
  resubmitForReview: vi.fn(),
}));

vi.mock("./pdf-dropzone", () => ({
  default: () => <div>PDF dropzone</div>,
}));

function renderReplace(
  overrides: Partial<ComponentProps<typeof ServiceReportReplace>> = {},
) {
  return render(
    <ServiceReportReplace
      analysisId="a-1"
      filePath="a-1/report.pdf"
      statusOfReview="Revision requested"
      statusOfSubmission="For approval"
      enabled
      onReplaced={vi.fn()}
      onResubmitted={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ServiceReportReplace", () => {
  it("places resubmit beside upload a new version after a revision request", () => {
    renderReplace();

    const upload = screen.getByRole("button", { name: "Upload a new version" });
    const resubmit = screen.getByRole("button", { name: "Resubmit for review" });
    expect(upload).toBeInTheDocument();
    expect(resubmit).toBeInTheDocument();
    expect(upload.parentElement).toBe(resubmit.parentElement);
  });

  it("places resubmit beside upload after a change request", () => {
    renderReplace({
      statusOfReview: "Reviewed",
      statusOfSubmission: "Changes requested",
    });

    expect(
      screen.getByRole("button", { name: "Upload a new version" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resubmit for approval" }),
    ).toBeInTheDocument();
  });

  it("hides resubmit while a replaced PDF is waiting for re-review", () => {
    renderReplace({
      statusOfReview: "For review",
      statusOfSubmission: "Changes requested",
    });

    expect(
      screen.getByRole("button", { name: "Upload a new version" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Resubmit for/ }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when the report is not awaiting send-back", () => {
    const { container } = renderReplace({ enabled: false });
    expect(container).toBeEmptyDOMElement();
  });
});
