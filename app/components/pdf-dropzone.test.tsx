import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PdfDropzone from "./pdf-dropzone";

vi.mock("./pdf-preview-modal", () => ({
  default: ({
    isOpen,
    file,
  }: {
    isOpen: boolean;
    file?: File | null;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="PDF preview">
        Previewing {file?.name}
      </div>
    ) : null,
}));

function pdfFile(name = "report.pdf") {
  return new File(["%PDF-1.4 sample"], name, { type: "application/pdf" });
}

describe("PdfDropzone", () => {
  it("offers a preview once a PDF is selected", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();

    const { rerender } = render(
      <PdfDropzone file={null} onFileChange={onFileChange} />,
    );

    const input = screen.getByLabelText("Service Report PDF");
    await user.upload(input, pdfFile());

    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalled();
    });
    const selected = onFileChange.mock.calls[0]?.[0] as File;
    expect(selected?.name).toBe("report.pdf");

    rerender(<PdfDropzone file={selected} onFileChange={onFileChange} />);

    expect(
      screen.getByRole("dialog", { name: "PDF preview" }),
    ).toHaveTextContent("Previewing report.pdf");

    await user.click(screen.getByRole("button", { name: "Preview this PDF" }));
    expect(
      screen.getByRole("dialog", { name: "PDF preview" }),
    ).toBeInTheDocument();
  });
});
