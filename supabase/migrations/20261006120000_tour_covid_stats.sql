-- Public Lab Tour page (/tour): aggregate SARS-CoV-2 surveillance totals.
--
-- covid_sequencing_run is staff-only under RLS. This SECURITY DEFINER
-- function exposes only summary numbers (no run IDs, comments, review flags
-- or per-run rows) so the tour page can show them to unauthenticated visitors.

CREATE OR REPLACE FUNCTION public.get_tour_covid_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH runs AS (
    SELECT
      samples_sequenced,
      lineage_assigned,
      COALESCE(date_loaded, date_received) AS run_date
    FROM public.covid_sequencing_run
  ),
  monthly AS (
    SELECT
      to_char(date_trunc('month', run_date), 'YYYY-MM') AS month,
      SUM(samples_sequenced)::int AS samples,
      COUNT(*)::int AS runs
    FROM runs
    WHERE run_date IS NOT NULL
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total_runs', (SELECT COUNT(*) FROM runs),
    'total_samples', (SELECT COALESCE(SUM(samples_sequenced), 0) FROM runs),
    'lineage_assigned', (SELECT COALESCE(SUM(lineage_assigned), 0) FROM runs),
    -- Denominator only counts runs where lineage calling was recorded.
    'samples_with_lineage_data', (
      SELECT COALESCE(SUM(samples_sequenced), 0) FROM runs WHERE lineage_assigned IS NOT NULL
    ),
    'first_run_date', (SELECT MIN(run_date) FROM runs),
    'last_run_date', (SELECT MAX(run_date) FROM runs),
    'monthly', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('month', month, 'samples', samples, 'runs', runs) ORDER BY month) FROM monthly),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_tour_covid_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tour_covid_stats() TO anon, authenticated;
