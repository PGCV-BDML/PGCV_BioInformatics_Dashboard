-- Link projects (repository assets) to Service Report Tracker run IDs.
ALTER TABLE public.project
  ADD COLUMN IF NOT EXISTS run_id text NULL;

CREATE INDEX IF NOT EXISTS idx_project_run_id
  ON public.project (run_id)
  WHERE run_id IS NOT NULL;
