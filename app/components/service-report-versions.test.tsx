import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiceReportVersions from "./service-report-versions";

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/service-report-file", () => ({
  getServiceReportSignedUrl: vi.fn(),
}));

vi.mock("@/lib/service-report-versions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/service-report-versions")>();
  return {
    ...actual,
    getServiceReportVersions: vi.fn(),
  };
});

import { getServiceReportVersions } from "@/lib/service-report-versions";

const mockGetVersions = vi.mocked(getServiceReportVersions);

describe("ServiceReportVersions", () => {
  it("lists older files and hides the current one", async () => {
    mockGetVersions.mockResolvedValue([
      {
        id: "v-2",
        analysis_id: "a-1",
        file_path: "a-1/2/current.pdf",
        file_name: "current.pdf",
        file_size: 10,
        kind: "revision",
        uploaded_by: null,
        uploaded_at: "2026-08-04T10:00:00.000Z",
      },
      {
        id: "v-1",
        analysis_id: "a-1",
        file_path: "a-1/1/original.pdf",
        file_name: "original.pdf",
        file_size: 10,
        kind: "upload",
        uploaded_by: null,
        uploaded_at: "2026-08-01T10:00:00.000Z",
      },
    ]);

    render(
      <ServiceReportVersions
        analysisId="a-1"
        currentPath="a-1/2/current.pdf"
      />,
    );

    expect(await screen.findByText("Previous versions")).toBeInTheDocument();
    expect(screen.getByText("original.pdf")).toBeInTheDocument();
    expect(screen.queryByText("current.pdf")).not.toBeInTheDocument();
    expect(screen.getByText(/Original/)).toBeInTheDocument();
  });
});
