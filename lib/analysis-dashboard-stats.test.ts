import { describe, expect, it } from "vitest";
import {
  getServiceReportsByClientId,
  MISSING_CLIENT_ID_LABEL,
  type AnalysisDashboardRow,
} from "./analysis-dashboard-stats";

function row(
  overrides: Partial<AnalysisDashboardRow> = {},
): AnalysisDashboardRow {
  return {
    service_report_date: "2026-03-01",
    service_report_number: "SR-2026-001",
    service_report_link: null,
    external_client_id: "CL-2026-100",
    ...overrides,
  };
}

describe("getServiceReportsByClientId", () => {
  it("counts generated reports per unique Client ID", () => {
    const rows: AnalysisDashboardRow[] = [
      row({ external_client_id: "CL-2026-100" }),
      row({
        service_report_number: "SR-2026-002",
        external_client_id: "cl-2026-100",
      }),
      row({
        service_report_number: "SR-2026-003",
        external_client_id: "CL-2026-200",
      }),
    ];

    expect(getServiceReportsByClientId(rows, "2026")).toEqual([
      { name: "CL-2026-100", value: 2 },
      { name: "CL-2026-200", value: 1 },
    ]);
  });

  it("ignores analyses that have no generated service report", () => {
    const rows: AnalysisDashboardRow[] = [
      row({ external_client_id: "CL-2026-100" }),
      row({
        service_report_number: null,
        service_report_link: null,
        external_client_id: "CL-2026-100",
      }),
    ];

    expect(getServiceReportsByClientId(rows, "2026")).toEqual([
      { name: "CL-2026-100", value: 1 },
    ]);
  });

  it("splits multi-ID cells and buckets missing IDs last", () => {
    const rows: AnalysisDashboardRow[] = [
      row({
        service_report_number: "SR-2026-010",
        external_client_id: "CL-2026-142, CL-2026-143",
      }),
      row({
        service_report_number: "SR-2026-011",
        external_client_id: "N/A",
      }),
    ];

    expect(getServiceReportsByClientId(rows, "all")).toEqual([
      { name: "CL-2026-142", value: 1 },
      { name: "CL-2026-143", value: 1 },
      { name: MISSING_CLIENT_ID_LABEL, value: 1 },
    ]);
  });

  it("respects the year filter", () => {
    const rows: AnalysisDashboardRow[] = [
      row({
        service_report_date: "2025-06-01",
        service_report_number: "SR-2025-001",
        external_client_id: "CL-2025-001",
      }),
      row({
        service_report_date: "2026-06-01",
        service_report_number: "SR-2026-001",
        external_client_id: "CL-2026-001",
      }),
    ];

    expect(getServiceReportsByClientId(rows, "2025")).toEqual([
      { name: "CL-2025-001", value: 1 },
    ]);
  });
});
