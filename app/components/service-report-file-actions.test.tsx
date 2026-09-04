import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceReportFileActions } from "./service-report-file-actions";
import { getServiceReportSignedUrl } from "@/lib/service-report-file";

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/service-report-file", () => ({
  getServiceReportSignedUrl: vi.fn(),
}));

const mockSignedUrl = vi.mocked(getServiceReportSignedUrl);

describe("ServiceReportFileActions", () => {
  beforeEach(() => {
    mockSignedUrl.mockReset();
    mockSignedUrl.mockResolvedValue("https://example.test/report.pdf");
    vi.stubGlobal("open", vi.fn());
  });

  it("previews without starting a download", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();

    render(
      <ServiceReportFileActions
        filePath="a-1/1/report.pdf"
        fileName="ClientReport.pdf"
        onPreview={onPreview}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Preview ClientReport.pdf" }),
    );
    expect(onPreview).toHaveBeenCalledOnce();
    expect(mockSignedUrl).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("opens an attachment URL when downloading", async () => {
    const user = userEvent.setup();

    render(
      <ServiceReportFileActions
        filePath="a-1/1/report.pdf"
        fileName="ClientReport.pdf"
        onPreview={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Download ClientReport.pdf" }),
    );

    expect(mockSignedUrl).toHaveBeenCalledWith(
      "a-1/1/report.pdf",
      "ClientReport.pdf",
    );
    expect(window.open).toHaveBeenCalledWith(
      "https://example.test/report.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
