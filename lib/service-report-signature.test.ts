import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  originalServiceReportBaseName,
  serviceReportDownloadFileName,
  stampedServiceReportFileName,
} from "./service-report-file";
import {
  canStampPreparedBy,
  extractLastPagePdf,
  rectForStamp,
  resolveSignatureRect,
} from "./service-report-signature";

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
  it("keeps the original name when the assignee stamps Prepared by", () => {
    expect(
      stampedServiceReportFileName("ClientReport.pdf", "prepared_by"),
    ).toBe("ClientReport.pdf");
  });

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

describe("extractLastPagePdf", () => {
  it("keeps only the last page of a multi-page report", async () => {
    const src = await PDFDocument.create();
    src.addPage([200, 300]);
    src.addPage([400, 500]);
    const extracted = await extractLastPagePdf(await src.save());

    expect(extracted.pageCount).toBe(2);
    expect(extracted.pageWidth).toBe(400);
    expect(extracted.pageHeight).toBe(500);

    const loaded = await PDFDocument.load(extracted.pdfBytes);
    expect(loaded.getPageCount()).toBe(1);
    expect(loaded.getPage(0).getWidth()).toBe(400);
    expect(loaded.getPage(0).getHeight()).toBe(500);
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
    page.drawText("Reviewed by:", { x: 72, y: 445, size: 12, font });
    page.drawText("JASMINE C. VELO", { x: 72, y: 357, size: 12, font: bold });
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

  /**
   * The PGCV template's signatory page as the parser actually sees it,
   * measured from PGCV-BIOINFO-SR-2026-118. Word encodes inter-word spacing
   * as TJ kerning, so labels arrive with their spaces stripped.
   */
  async function pgcvSignatoryPage() {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.276, 841.89]);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const line = (text: string, x: number, y: number) =>
      page.drawText(text, { x, y, size: 10.9, font });
    line("Preparedby:", 72, 680.4);
    line("MICAHDANIELLED.LOJERA", 72, 592.5);
    line("SeniorResearchAssociate,PhilippineGenomeCenterVisayas", 72, 561.3);
    line("Reviewedby:", 72, 445.1);
    line("JASMINEC.VELO", 71.8, 357.3);
    line("UniversityResearchAssociateI,PhilippineGenomeCenterVisayas", 72, 326.1);
    line("ApprovedforRelease:", 71.7, 209.9);
    line("VICTORMARCOEMMANUELN.FERRIOLS,PhD.", 71.7, 122.0);
    line("AssistanttotheExecutiveDirector,PhilippineGenomeCenterVisayas", 72, 90.8);
    const loaded = await PDFDocument.load(await pdf.save());
    return loaded.getPages()[0]!;
  }

  it("matches labels whose spaces Word stripped into TJ kerning", async () => {
    const page = await pgcvSignatoryPage();
    const drop = 0.25 * (72 / 2.54);

    const prepared = resolveSignatureRect(page, "prepared_by", 400, 100);
    expect(prepared.x).toBeCloseTo(72, 0);
    expect(prepared.width).toBe(160);
    expect(prepared.height).toBe(40);
    expect(prepared.y).toBeCloseTo(592.5 - drop, 0);
    expect(prepared.y + prepared.height).toBeCloseTo(632.5 - drop, 0);

    const reviewed = resolveSignatureRect(page, "reviewed_by", 400, 100);
    expect(reviewed.x).toBeCloseTo(72, 0);
    expect(reviewed.width).toBe(160);
    expect(reviewed.height).toBe(40);
    expect(reviewed.y).toBeCloseTo(357.3 - drop, 0);
    expect(reviewed.y + reviewed.height).toBeCloseTo(397.3 - drop, 0);

    const approved = resolveSignatureRect(page, "approved_by", 400, 100);
    expect(approved.x).toBeCloseTo(71.7, 0);
    expect(approved.width).toBe(160);
    expect(approved.height).toBe(40);
    expect(approved.y).toBeCloseTo(122.0 - drop, 0);
    expect(approved.y + approved.height).toBeCloseTo(162.0 - drop, 0);
  });

  it("overlaps the printed name at full stamp size", async () => {
    const page = await pgcvSignatoryPage();
    const drop = 0.25 * (72 / 2.54);
    for (const [slot, label, nameBaseline] of [
      ["prepared_by", 680.4, 592.5],
      ["reviewed_by", 445.1, 357.3],
      ["approved_by", 209.9, 122.0],
    ] as const) {
      const rect = resolveSignatureRect(page, slot, 400, 100);
      expect(rect.height).toBe(40);
      expect(rect.y).toBeCloseTo(nameBaseline - drop, 0);
      expect(rect.y + rect.height).toBeGreaterThan(nameBaseline);
      expect(rect.y + rect.height).toBeLessThan(label);
    }
  });

  it("puts the assignee stamp over the printed name under Prepared by", async () => {
    const page = await signatoryPage();
    const drop = 0.25 * (72 / 2.54);
    const rect = resolveSignatureRect(page, "prepared_by", 400, 100);
    expect(rect.height).toBe(40);
    expect(rect.y).toBeCloseTo(561 - drop, 0);
    expect(rect.y + rect.height).toBeLessThan(593);
  });

  it("puts the reviewing stamp over the printed name under Reviewed by", async () => {
    const page = await signatoryPage();
    const drop = 0.25 * (72 / 2.54);
    const rect = resolveSignatureRect(page, "reviewed_by", 400, 100);
    expect(rect.height).toBe(40);
    expect(rect.y).toBeCloseTo(357 - drop, 0);
    expect(rect.y + rect.height).toBeLessThan(445);
  });

  it("puts the approving stamp over the printed name under Approved for Release", async () => {
    const page = await signatoryPage();
    const drop = 0.25 * (72 / 2.54);
    const rect = resolveSignatureRect(page, "approved_by", 400, 100);
    expect(rect.height).toBe(40);
    expect(rect.y).toBeCloseTo(121 - drop, 0);
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
    expect(rect.y).toBeCloseTo(356 - 0.25 * (72 / 2.54), 0);
    expect(rect.y + rect.height).toBeLessThan(446);
  });

  it("lets an officer override win over the auto placement", async () => {
    const page = await pgcvSignatoryPage();
    const override = { x: 90, y: 140, width: 180, height: 45 };
    const rect = rectForStamp(page, "approved_by", 400, 100, override);
    expect(rect.x).toBe(90);
    expect(rect.y).toBe(140);
    expect(rect.width).toBe(180);
    expect(rect.height).toBe(45);
  });

  it("clamps an override that hangs off the page", async () => {
    const page = await pgcvSignatoryPage();
    const rect = rectForStamp(
      page,
      "reviewed_by",
      400,
      100,
      { x: 900, y: -40, width: 160, height: 40 },
    );
    expect(rect.x + rect.width).toBeCloseTo(page.getWidth(), 5);
    expect(rect.y).toBe(0);
  });
});

describe("canStampPreparedBy", () => {
  it("allows the assigned person", () => {
    expect(canStampPreparedBy("u-1", "u-1")).toBe(true);
  });

  it("allows the current user when no assignee is set", () => {
    expect(canStampPreparedBy(null, "u-1")).toBe(true);
    expect(canStampPreparedBy("", "u-1")).toBe(true);
  });

  it("blocks a different user and anyone who is signed out", () => {
    expect(canStampPreparedBy("u-1", "u-2")).toBe(false);
    expect(canStampPreparedBy("u-1", null)).toBe(false);
    expect(canStampPreparedBy(null, null)).toBe(false);
  });
});
