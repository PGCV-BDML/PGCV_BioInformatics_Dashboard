-- Adds 'cancelled' to public.task_status for the Tasks list.
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.

ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'cancelled';
