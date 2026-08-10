-- ============================================================
-- 20260810120000_task_date_range.sql
--
-- Tasks may span multiple calendar days (events, travel, etc.).
-- Backfill from legacy due_date; keep due_date in sync as end date.
-- ============================================================

ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS start_date date NULL,
  ADD COLUMN IF NOT EXISTS end_date   date NULL;

UPDATE public.task
SET
  start_date = due_date,
  end_date   = due_date
WHERE due_date IS NOT NULL
  AND start_date IS NULL;

ALTER TABLE public.task
  DROP CONSTRAINT IF EXISTS task_date_range_chk;

ALTER TABLE public.task
  ADD CONSTRAINT task_date_range_chk CHECK (
    (end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)
  );

COMMENT ON COLUMN public.task.start_date IS 'First day the task or event applies.';
COMMENT ON COLUMN public.task.end_date IS 'Last day; defaults to start_date when omitted.';
