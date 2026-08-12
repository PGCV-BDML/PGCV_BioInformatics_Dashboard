import { describe, expect, it } from "vitest";
import {
  buildServiceReportPath,
  serviceReportStorageLeafName,
  slugifyFileName,
} from "./service-report-file";

describe("slugifyFileName", () => {
  it("preserves underscores so _signed survives in storage leaves", () => {
    expect(slugifyFileName("pgcv-bioinfo-sr-2026-272-penuela_signed.pdf")).toBe(
      "pgcv-bioinfo-sr-2026-272-penuela_signed",
    );
  });
});

describe("buildServiceReportPath", () => {
  it("puts uniqueness in a timestamp folder and keeps a clean leaf", () => {
    const path = buildServiceReportPath(
      "analysis-id",
      "PGCV-Bioinfo-SR-2026-272-Penuela_signed.pdf",
    );
    expect(path).toMatch(
      /^analysis-id\/\d{10,}\/pgcv-bioinfo-sr-2026-272-penuela_signed\.pdf$/,
    );
  });
});

describe("serviceReportStorageLeafName", () => {
  it("always ends with .pdf", () => {
    expect(serviceReportStorageLeafName("report_signed")).toBe(
      "report_signed.pdf",
    );
  });
});
