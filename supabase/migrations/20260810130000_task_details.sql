-- Optional location, room, link, or other notes for a task/event.

ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS details text NULL;

COMMENT ON COLUMN public.task.details IS
  'Optional location, venue, or other task details.';
