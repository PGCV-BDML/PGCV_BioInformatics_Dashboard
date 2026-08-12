import { describe, expect, it } from "vitest";
import {
  originalServiceReportBaseName,
  serviceReportDownloadFileName,
  stampedServiceReportFileName,
} from "./service-report-file";

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
