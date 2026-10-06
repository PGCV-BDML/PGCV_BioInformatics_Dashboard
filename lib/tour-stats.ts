/**
 * Aggregate COVID-19 surveillance numbers for the public Lab Tour page,
 * read from the get_tour_covid_stats() RPC (totals only — see
 * supabase/migrations/20261006120000_tour_covid_stats.sql).
 */

export type TourCovidStats = {
  totalRuns: number;
  totalSamples: number;
  lineageAssigned: number;
  /** % of samples (in runs with lineage data) that got a lineage, or null. */
  pctLineageAssigned: number | null;
  firstRunDate: string | null;
  lastRunDate: string | null;
  quarterly: { label: string; samples: number }[];
};

/** Seconds the stats are reused before Supabase is queried again. */
export const TOUR_STATS_REVALIDATE_SECONDS = 3600;

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function date(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** "2022-07" style months → contiguous "Q3 2022" buckets, gaps filled with 0. */
export function toQuarters(
  monthly: { month: string; samples: number }[],
): { label: string; samples: number }[] {
  const totals = new Map<number, number>();
  for (const { month, samples } of monthly) {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) continue;
    const key = Number(m[1]) * 4 + Math.floor((Number(m[2]) - 1) / 3);
    totals.set(key, (totals.get(key) ?? 0) + samples);
  }
  if (totals.size === 0) return [];
  const keys = [...totals.keys()];
  const out: { label: string; samples: number }[] = [];
  for (let k = Math.min(...keys); k <= Math.max(...keys); k++) {
    out.push({ label: `Q${(k % 4) + 1} ${Math.floor(k / 4)}`, samples: totals.get(k) ?? 0 });
  }
  return out;
}

export function parseTourCovidStats(raw: unknown): TourCovidStats | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const totalRuns = num(o.total_runs);
  if (totalRuns === 0) return null;

  const lineageAssigned = num(o.lineage_assigned);
  const withLineageData = num(o.samples_with_lineage_data);
  const monthly = Array.isArray(o.monthly)
    ? o.monthly.flatMap((m) =>
        m && typeof m === "object" && typeof (m as Record<string, unknown>).month === "string"
          ? [{ month: (m as Record<string, unknown>).month as string, samples: num((m as Record<string, unknown>).samples) }]
          : [],
      )
    : [];

  return {
    totalRuns,
    totalSamples: num(o.total_samples),
    lineageAssigned,
    pctLineageAssigned:
      withLineageData > 0 ? Math.min(100, (lineageAssigned / withLineageData) * 100) : null,
    firstRunDate: date(o.first_run_date),
    lastRunDate: date(o.last_run_date),
    quarterly: toQuarters(monthly),
  };
}

/** Server-side fetch through PostgREST with the public key; null if unavailable. */
export async function getTourCovidStats(): Promise<TourCovidStats | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_tour_covid_stats`, {
      // apikey alone runs the call as `anon`; publishable keys are not JWTs,
      // so they must not be sent as a Bearer token.
      headers: { apikey: key },
      next: { revalidate: TOUR_STATS_REVALIDATE_SECONDS },
    });
    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }
    return parseTourCovidStats(await response.json());
  } catch (error) {
    console.error("Lab tour: COVID-19 stats unavailable.", error);
    return null;
  }
}
