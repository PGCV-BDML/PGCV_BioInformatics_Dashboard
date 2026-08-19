-- Optional clock time for a task (independent of the date range).

ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS task_time time NULL;

COMMENT ON COLUMN public.task.task_time IS
  'Optional time of day for the task; dates stay on start_date / end_date.';
