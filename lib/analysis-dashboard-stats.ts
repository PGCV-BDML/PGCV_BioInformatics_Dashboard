import {
  CLIENT_TYPE_OPTIONS,
  displayAnalysisLabel,
  parseServiceReportNumber,
} from "@/lib/analysis-tracker";
import type { AnalysisStatus } from "@/types/database";

/** Minimal analysis fields needed for Sequence Analysis dashboard aggregations. */
export type AnalysisDashboardRow = {
  service_report_date?: string | null;
  service_report_number?: string | null;
  service_report_link?: string | null;
  pipeline?: string | null;
  application?: string | null;
  status?: AnalysisStatus | string | null;
  started_at?: string | null;
  client_name?: string | null;
  client_type?: string | null;
};

export type AnalysisDashboardStats = {
  total: number;
  completed: number;
  ongoing: number;
  onHold: number;
  withServiceReport: number;
  distinctClients: number;
};

export type NamedCount = { name: string; value: number };

function yearFromDate(dateVal: string | null | undefined): string | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) {
    const m = String(dateVal).trim().match(/^(\d{4})/);
    return m?.[1] ?? null;
  }
  return String(d.getFullYear());
}

/**
 * Year of analysis: service_report_date → SR# year → started_at year.
 */
export function getAnalysisYear(row: AnalysisDashboardRow): string | null {
  const fromDate = yearFromDate(row.service_report_date);
  if (fromDate) return fromDate;

  const parsed = parseServiceReportNumber(row.service_report_number);
  if (parsed) return String(parsed.year);

  return yearFromDate(row.started_at);
}

export function filterAnalysesByYear<T extends AnalysisDashboardRow>(
  rows: T[],
  year: string,
): T[] {
  if (!year || year === "all") return rows;
  return rows.filter((row) => getAnalysisYear(row) === year);
}

/** Display label for year filters (`all` → All time). */
export function formatAnalysisYearLabel(year: string): string {
  if (!year || year === "all") return "All time";
  return year;
}

/** Distinct years descending, derived from data (always includes current year). */
export function getAvailableAnalysisYears(
  rows: AnalysisDashboardRow[],
): string[] {
  const years = new Set<string>();
  years.add(String(new Date().getFullYear()));
  for (const row of rows) {
    const y = getAnalysisYear(row);
    if (y) years.add(y);
  }
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function hasServiceReport(row: AnalysisDashboardRow): boolean {
  return Boolean(
    (row.service_report_number && String(row.service_report_number).trim()) ||
      (row.service_report_link && String(row.service_report_link).trim()),
  );
}

export function getAnalysisDashboardStats(
  rows: AnalysisDashboardRow[],
  year: string,
): AnalysisDashboardStats {
  const scoped = filterAnalysesByYear(rows, year);
  const clients = new Set<string>();

  let completed = 0;
  let ongoing = 0;
  let onHold = 0;
  let withServiceReport = 0;

  for (const row of scoped) {
    const status = String(row.status ?? "").toLowerCase();
    if (status === "completed") completed += 1;
    else if (status === "ongoing") ongoing += 1;
    else if (status === "on_hold") onHold += 1;

    if (hasServiceReport(row)) withServiceReport += 1;

    const client = row.client_name?.trim();
    if (client) clients.add(client.toLowerCase());
  }

  return {
    total: scoped.length,
    completed,
    ongoing,
    onHold,
    withServiceReport,
    distinctClients: clients.size,
  };
}

/** Counts by analysis classification (pipeline / application label). */
export function getAnalysesByType(
  rows: AnalysisDashboardRow[],
  year: string,
): NamedCount[] {
  const scoped = filterAnalysesByYear(rows, year);
  const counts = new Map<string, number>();

  for (const row of scoped) {
    const name = displayAnalysisLabel(row.pipeline, row.application);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/** Counts by client type (UPV, PGCV, SUCs, etc.). */
export function getAnalysesByClientType(
  rows: AnalysisDashboardRow[],
  year: string,
): NamedCount[] {
  const scoped = filterAnalysesByYear(rows, year);
  const counts = new Map<string, number>();

  for (const row of scoped) {
    const name = row.client_type?.trim() || "—";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const preferred = CLIENT_TYPE_OPTIONS as readonly string[];
  const ordered: NamedCount[] = [];

  for (const name of preferred) {
    const value = counts.get(name);
    if (value) ordered.push({ name, value });
    counts.delete(name);
  }

  const extras = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      if (a.name === "—") return 1;
      if (b.name === "—") return -1;
      return b.value - a.value || a.name.localeCompare(b.name);
    });

  return [...ordered, ...extras];
}
