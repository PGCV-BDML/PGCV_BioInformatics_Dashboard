-- ============================================================
-- 20260804120000_task_category_training.sql
--
-- Adds 'training' to public.task_category for task tags.
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'training';
