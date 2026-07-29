-- Remove unused Status of Analysis column from the Service Report Tracker.
-- Completion + Submission cover the workflow; analysis status was never populated.

ALTER TABLE public.analysis
  DROP COLUMN IF EXISTS status_of_analysis;
