-- ============================================================
-- 20260915200000_repository_category_server.sql
--
-- Adds 'server' to public.repository_category so server links
-- can be tagged on the Repositories tab.
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'server';
