-- ============================================================
-- 20260813150000_repository_category_turnover_forms.sql
--
-- Adds 'turnover_forms' to public.repository_category so
-- turnover form links have their own Repositories tab instead
-- of being grouped under Other.
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'turnover_forms';
