import { describe, expect, it } from "vitest";
import {
  originalServiceReportBaseName,
  stampedServiceReportFileName,
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
