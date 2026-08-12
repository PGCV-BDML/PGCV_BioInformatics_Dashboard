import type { CovidSequencingRun } from "@/types/database";

/** Days between receive and load; null when either date is missing. */
export function turnaroundDays(
  dateReceived: string | null | undefined,
  dateLoaded: string | null | undefined,
): number | null {
  if (!dateReceived || !dateLoaded) return null;
  const received = Date.parse(`${dateReceived}T00:00:00Z`);
  const loaded = Date.parse(`${dateLoaded}T00:00:00Z`);
  if (Number.isNaN(received) || Number.isNaN(loaded)) return null;
  return Math.round((loaded - received) / 86_400_000);
}

export function lineageUnassigned(row: Pick<
  CovidSequencingRun,
  "samples_sequenced" | "lineage_assigned"
>): number | null {
  if (row.lineage_assigned == null) return null;
  return Math.max(0, row.samples_sequenced - row.lineage_assigned);
}

/** Percent of samples with a lineage assignment (0–100), or null. */
export function pctAssigned(row: Pick<
  CovidSequencingRun,
  "samples_sequenced" | "lineage_assigned"
>): number | null {
  if (!row.samples_sequenced || row.lineage_assigned == null) return null;
  return (row.lineage_assigned / row.samples_sequenced) * 100;
}

export type CovidRunSummaryStats = {
  totalRuns: number;
  totalSamples: number;
  totalLineageAssigned: number;
  /** Overall % of sequenced samples with a lineage (0–100), or null if no samples. */
  pctLineageAssigned: number | null;
  gisaidUploaded: number;
  islapUploaded: number;
  reviewFlagged: number;
};

export function getCovidRunSummaryStats(
  rows: readonly CovidSequencingRun[],
): CovidRunSummaryStats {
  let totalSamples = 0;
  let totalLineageAssigned = 0;
  let gisaidUploaded = 0;
  let islapUploaded = 0;
  let reviewFlagged = 0;

  for (const row of rows) {
    totalSamples += row.samples_sequenced ?? 0;
    totalLineageAssigned += row.lineage_assigned ?? 0;
    if (row.uploaded_gisaid) gisaidUploaded += 1;
    if (row.uploaded_islap) islapUploaded += 1;
    if (row.review_flag?.trim()) reviewFlagged += 1;
  }

  return {
    totalRuns: rows.length,
    totalSamples,
    totalLineageAssigned,
    pctLineageAssigned:
      totalSamples > 0 ? (totalLineageAssigned / totalSamples) * 100 : null,
    gisaidUploaded,
    islapUploaded,
    reviewFlagged,
  };
}

/** Calendar year from date_loaded, else date_received, else null. */
export function runYear(row: Pick<
  CovidSequencingRun,
  "date_loaded" | "date_received"
>): string | null {
  const source = row.date_loaded || row.date_received;
  if (!source) return null;
  return source.slice(0, 4);
}

export function availableRunYears(
  rows: readonly CovidSequencingRun[],
): string[] {
  const years = new Set<string>();
  for (const row of rows) {
    const y = runYear(row);
    if (y) years.add(y);
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}
