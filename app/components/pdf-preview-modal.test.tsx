import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PdfPreviewModal from "./pdf-preview-modal";
import {
  extractLastPagePdf,
  prepareSignaturePreviewFromPdf,
  stampPdfBytes,
} from "@/lib/service-report-signature";

vi.mock("@/lib/service-report-signature", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/service-report-signature")>();
  return {
    ...actual,
    extractLastPagePdf: vi.fn(),
    prepareSignaturePreviewFromPdf: vi.fn(),
    stampPdfBytes: vi.fn(),
    downloadReportPdfBytes: vi.fn(),
  };
});

vi.mock("./signature-page-preview", () => ({
  SignaturePagePreview: () => <div data-testid="signature-page-preview" />,
}));

vi.mock("./pdf-last-page-canvas", () => ({
  PdfLastPageCanvas: () => <div data-testid="last-page-canvas" />,
}));

vi.mock("./my-signature-modal", () => ({
  default: () => null,
}));

const lastPage = {
  pdfBytes: new Uint8Array([1, 2, 3]),
  pageWidth: 595,
  pageHeight: 842,
  pageCount: 2,
};

const signaturePreview = {
  slot: "prepared_by" as const,
  pageWidth: 595,
  pageHeight: 842,
  pageCount: 2,
  defaultRect: { x: 72, y: 560, width: 160, height: 40 },
  pdfBytes: new Uint8Array([4, 5, 6]),
  signatureBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  imageWidth: 400,
  imageHeight: 100,
};

describe("PdfPreviewModal", () => {
  beforeEach(() => {
    vi.mocked(extractLastPagePdf).mockReset();
    vi.mocked(prepareSignaturePreviewFromPdf).mockReset();
    vi.mocked(stampPdfBytes).mockReset();
    vi.mocked(extractLastPagePdf).mockResolvedValue(lastPage);
    vi.mocked(prepareSignaturePreviewFromPdf).mockResolvedValue(
      signaturePreview,
    );
    vi.mocked(stampPdfBytes).mockResolvedValue(new Uint8Array([9, 9, 9]));
  });

  it("shows the last page instead of embedding the full PDF", async () => {
    const file = new File(["%PDF-1.4"], "report.pdf", {
      type: "application/pdf",
    });

    render(
      <PdfPreviewModal isOpen file={file} onClose={vi.fn()} />,
    );

    expect(await screen.findByTestId("last-page-canvas")).toBeInTheDocument();
    expect(screen.getByText(/last page of 2/i)).toBeInTheDocument();
    expect(screen.queryByTestId("signature-page-preview")).not.toBeInTheDocument();
  });

  it("lets the assignee drag a signature and apply it to the local file", async () => {
    const user = userEvent.setup();
    const onSignatureApplied = vi.fn();
    const file = new File(["%PDF-1.4"], "report.pdf", {
      type: "application/pdf",
    });

    render(
      <PdfPreviewModal
        isOpen
        file={file}
        signatureSlot="prepared_by"
        onSignatureApplied={onSignatureApplied}
        onClose={vi.fn()}
      />,
    );

    expect(
      await screen.findByTestId("signature-page-preview"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Place your signature" }),
    ).toBeInTheDocument();

    const attach = screen.getByRole("button", { name: "Attach signature" });
    expect(attach).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: /my signature is on the correct line/i,
      }),
    );
    expect(attach).toBeEnabled();

    await user.click(attach);
    await waitFor(() => {
      expect(onSignatureApplied).toHaveBeenCalled();
    });
    const stamped = onSignatureApplied.mock.calls[0]?.[0] as File;
    expect(stamped.name).toBe("report.pdf");
    expect(stamped.type).toBe("application/pdf");
  });
});
