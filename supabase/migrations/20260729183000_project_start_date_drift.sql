-- Reconcile project date columns that exist in 19_initial_schema.sql /
-- app types but are missing on some live Supabase projects (schema drift).
-- Dashboard stats previously failed with:
--   column project.start_date does not exist

ALTER TABLE public.project
  ADD COLUMN IF NOT EXISTS start_date date NULL,
  ADD COLUMN IF NOT EXISTS target_delivery_date date NULL,
  ADD COLUMN IF NOT EXISTS actual_delivery_date date NULL;

-- Backfill start_date from created_at so year filters have a value.
UPDATE public.project
SET start_date = (created_at AT TIME ZONE 'UTC')::date
WHERE start_date IS NULL
  AND created_at IS NOT NULL;
