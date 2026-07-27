-- Expand analysis to match the Service Report Tracker Excel model.
-- Records are service-report-centric; project/assignee links are optional.

ALTER TABLE public.analysis
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.analysis
  ALTER COLUMN assignee_id DROP NOT NULL;

ALTER TABLE public.analysis
  ADD COLUMN IF NOT EXISTS service_report_number text NULL,
  ADD COLUMN IF NOT EXISTS service_report_date date NULL,
  ADD COLUMN IF NOT EXISTS application text NULL,
  ADD COLUMN IF NOT EXISTS client_name text NULL,
  ADD COLUMN IF NOT EXISTS client_type text NULL,
  ADD COLUMN IF NOT EXISTS external_client_id text NULL,
  ADD COLUMN IF NOT EXISTS external_project_id text NULL,
  ADD COLUMN IF NOT EXISTS sample_type text NULL,
  ADD COLUMN IF NOT EXISTS run_id text NULL,
  ADD COLUMN IF NOT EXISTS status_of_analysis text NULL,
  ADD COLUMN IF NOT EXISTS status_of_completion text NULL,
  ADD COLUMN IF NOT EXISTS status_of_submission text NULL,
  ADD COLUMN IF NOT EXISTS service_report_link text NULL,
  ADD COLUMN IF NOT EXISTS client_sequences_link text NULL,
  ADD COLUMN IF NOT EXISTS notes text NULL;

-- Canonical SR# uniqueness for real records (nulls allowed for incomplete rows).
CREATE UNIQUE INDEX IF NOT EXISTS analysis_service_report_number_uidx
  ON public.analysis (service_report_number)
  WHERE service_report_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_status_of_completion
  ON public.analysis (status_of_completion);

CREATE INDEX IF NOT EXISTS idx_analysis_external_client_id
  ON public.analysis (external_client_id);

CREATE INDEX IF NOT EXISTS idx_analysis_external_project_id
  ON public.analysis (external_project_id);
