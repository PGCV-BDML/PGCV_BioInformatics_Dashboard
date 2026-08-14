import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  originalServiceReportBaseName,
  serviceReportDownloadFileName,
  stampedServiceReportFileName,
} from "./service-report-file";
import { resolveSignatureRect } from "./service-report-signature";

describe("originalServiceReportBaseName", () => {
  it("returns the upload basename without the extension", () => {
    expect(originalServiceReportBaseName("ClientReport.pdf")).toBe(
      "ClientReport",
    );
  });

  it("strips stacked stamp suffixes back to the original", () => {
    expect(
      originalServiceReportBaseName("ClientReport-reviewed-approved.pdf"),
    ).toBe("ClientReport");
    expect(originalServiceReportBaseName("ClientReport-reviewed.pdf")).toBe(
      "ClientReport",
    );
    expect(originalServiceReportBaseName("ClientReport_signed.pdf")).toBe(
      "ClientReport",
    );
  });

  it("strips storage-key timestamp prefixes", () => {
    expect(
      originalServiceReportBaseName(
        "1786522622774-pgcv-bioinfo-sr-2026-272-penuela-reviewed-reviewed-approved.pdf",
      ),
    ).toBe("pgcv-bioinfo-sr-2026-272-penuela");
  });

  it("falls back when the name is blank", () => {
    expect(originalServiceReportBaseName(null)).toBe("service-report");
    expect(originalServiceReportBaseName("")).toBe("service-report");
    expect(originalServiceReportBaseName("-reviewed.pdf")).toBe(
      "service-report",
    );
  });
});

describe("stampedServiceReportFileName", () => {
  it("marks peer review with -reviewed on the original name", () => {
    expect(
      stampedServiceReportFileName("ClientReport.pdf", "reviewed_by"),
    ).toBe("ClientReport-reviewed.pdf");
  });

  it("on approval restores the original name and appends _signed", () => {
    expect(
      stampedServiceReportFileName("ClientReport-reviewed.pdf", "approved_by"),
    ).toBe("ClientReport_signed.pdf");
    expect(
      stampedServiceReportFileName(
        "ClientReport-reviewed-approved.pdf",
        "approved_by",
      ),
    ).toBe("ClientReport_signed.pdf");
    expect(
      stampedServiceReportFileName("ClientReport.pdf", "approved_by"),
    ).toBe("ClientReport_signed.pdf");
  });
});

describe("serviceReportDownloadFileName", () => {
  it("normalizes stacked storage-key leaves to original_signed.pdf", () => {
    expect(
      serviceReportDownloadFileName(
        "1786522622774-pgcv-bioinfo-sr-2026-272-penuela-reviewed-reviewed-approved",
      ),
    ).toBe("pgcv-bioinfo-sr-2026-272-penuela_signed.pdf");
  });

  it("keeps a clean original upload name", () => {
    expect(
      serviceReportDownloadFileName("PGCV-Bioinfo-SR-2026-272-Penuela.pdf"),
    ).toBe("PGCV-Bioinfo-SR-2026-272-Penuela.pdf");
  });
});

describe("resolveSignatureRect", () => {
  async function signatoryPage() {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    page.drawText("Prepared by:", { x: 72, y: 593, size: 12, font });
    page.drawText("MICAH DANIELLE D. LOJERA", {
      x: 72,
      y: 561,
      size: 12,
      font: bold,
    });
    page.drawText("Reviewed by:", { x: 72, y: 358, size: 12, font });
    page.drawText("JASMINE C. VELO", { x: 72, y: 324, size: 12, font: bold });
    page.drawText("Approved for Release:", { x: 72, y: 210, size: 12, font });
    page.drawText("VICTOR MARCO EMMANUEL N. FERRIOLS, PhD.", {
      x: 72,
      y: 121,
      size: 12,
      font: bold,
    });
    const bytes = await pdf.save();
    const loaded = await PDFDocument.load(bytes);
    return loaded.getPages()[0]!;
  }

  it("puts the reviewing stamp between Reviewed by and the printed name", async () => {
    const page = await signatoryPage();
    const rect = resolveSignatureRect(page, "reviewed_by", 400, 100);
    expect(rect.y).toBeGreaterThan(324);
    expect(rect.y + rect.height).toBeLessThan(358);
  });

  it("puts the approving stamp between Approved for Release and the printed name", async () => {
    const page = await signatoryPage();
    const rect = resolveSignatureRect(page, "approved_by", 400, 100);
    expect(rect.y).toBeGreaterThan(121);
    expect(rect.y + rect.height).toBeLessThan(210);
  });

  it("stays below the label when the label's own line is split into runs", async () => {
    // Word/LibreOffice often emit a second run a few points under the
    // baseline of the same visual line; it must not be read as the name.
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    page.drawText("Reviewed by", { x: 72, y: 446, size: 12, font });
    page.drawText(":", { x: 138, y: 437, size: 12, font });
    page.drawText("JASMINE C. VELO", { x: 72, y: 356, size: 12, font });
    page.drawText("Approved for Release:", { x: 72, y: 214, size: 12, font });
    page.drawText("VICTOR MARCO N. FERRIOLS", {
      x: 72,
      y: 125,
      size: 12,
      font,
    });
    const loaded = await PDFDocument.load(await pdf.save());
    const reloaded = loaded.getPages()[0]!;

    const rect = resolveSignatureRect(reloaded, "reviewed_by", 400, 100);
    expect(rect.y + rect.height).toBeLessThan(446);
    expect(rect.y).toBeGreaterThan(356);
  });
});
