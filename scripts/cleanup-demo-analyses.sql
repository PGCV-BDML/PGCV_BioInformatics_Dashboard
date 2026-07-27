-- Remove pre-migration demo analysis rows (seed data).
-- Safe filter: keep anything with a real Service Report Number from the Excel import.
--
-- Run this in the Supabase SQL Editor AFTER or AFTER the Tracker import.
-- Preview first (optional):

-- SELECT id, pipeline, pipeline_version, status, service_report_number
-- FROM public.analysis
-- WHERE service_report_number IS NULL
--    OR service_report_number NOT LIKE 'PGCV-BIOINFO-SR-%';

BEGIN;

-- Linked tasks (Tasks / Calendar sync)
DELETE FROM public.task_tag
WHERE task_id IN (
  SELECT t.id
  FROM public.task t
  JOIN public.analysis a ON a.id = t.linked_analysis_id
  WHERE a.service_report_number IS NULL
     OR a.service_report_number NOT LIKE 'PGCV-BIOINFO-SR-%'
);

DELETE FROM public.task
WHERE linked_analysis_id IN (
  SELECT id
  FROM public.analysis
  WHERE service_report_number IS NULL
     OR service_report_number NOT LIKE 'PGCV-BIOINFO-SR-%'
);

-- Generated service_report rows tied to demo analyses
DELETE FROM public.service_report
WHERE analysis_id IN (
  SELECT id
  FROM public.analysis
  WHERE service_report_number IS NULL
     OR service_report_number NOT LIKE 'PGCV-BIOINFO-SR-%'
);

-- Demo analyses themselves
DELETE FROM public.analysis
WHERE service_report_number IS NULL
   OR service_report_number NOT LIKE 'PGCV-BIOINFO-SR-%';

COMMIT;

-- Sanity check: should mostly/only show PGCV-BIOINFO-SR-* rows
-- SELECT count(*) AS total,
--        count(*) FILTER (WHERE service_report_number LIKE 'PGCV-BIOINFO-SR-%') AS from_excel
-- FROM public.analysis;
