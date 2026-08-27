import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignatureConfirmModal from "./signature-confirm-modal";
import { prepareSignaturePreview } from "@/lib/service-report-signature";
import { MissingSignatureError } from "@/lib/user-signature";
import type { SignaturePreview } from "@/lib/service-report-signature";

vi.mock("@/lib/service-report-signature", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/service-report-signature")>();
  return {
    ...actual,
    prepareSignaturePreview: vi.fn(),
  };
});

vi.mock("./signature-page-preview", () => ({
  SignaturePagePreview: () => <div data-testid="signature-page-preview" />,
}));

const preview: SignaturePreview = {
  analysisId: "a-1",
  slot: "reviewed_by",
  pageWidth: 595,
  pageHeight: 842,
  pageCount: 2,
  defaultRect: { x: 72, y: 350, width: 160, height: 40 },
  pdfBytes: new Uint8Array([1, 2, 3]),
  signatureBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  imageWidth: 400,
  imageHeight: 100,
};

describe("SignatureConfirmModal", () => {
  beforeEach(() => {
    prepareSignaturePreview.mockReset();
    vi.mocked(prepareSignaturePreview).mockResolvedValue(preview);
  });

  it("does not apply the stamp until the officer confirms placement", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <SignatureConfirmModal
        isOpen
        analysisId="a-1"
        action="review"
        reportLabel="PGCV-BIOINFO-SR-2026-001"
        onClose={vi.fn()}
        onMissingSignature={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(
      await screen.findByTestId("signature-page-preview"),
    ).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Complete review" });
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: /my signature is on the correct line/i,
      }),
    );
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onConfirm).toHaveBeenCalledWith(preview.defaultRect);
  });

  it("asks for a signature upload when none is on file", async () => {
    vi.mocked(prepareSignaturePreview).mockRejectedValueOnce(
      new MissingSignatureError(),
    );
    const onMissingSignature = vi.fn();

    render(
      <SignatureConfirmModal
        isOpen
        analysisId="a-1"
        action="approve"
        onClose={vi.fn()}
        onMissingSignature={onMissingSignature}
        onConfirm={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(onMissingSignature).toHaveBeenCalled();
    });
  });
});
