-- ============================================================
-- 20260731000000_task_category_events.sql
--
-- Adds 'events' to public.task_category. The value already
-- exists on the live database (added directly, outside of a
-- migration), but 20260727120000_task_categories_and_analysis_
-- link.sql declares only twelve values, so a fresh database
-- built from this repo would not have it.
--
-- The app-side list (lib/task-categories.ts, types/database.ts)
-- is what drives the selectable chips; this migration only keeps
-- the schema in the repo honest.
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'events';
