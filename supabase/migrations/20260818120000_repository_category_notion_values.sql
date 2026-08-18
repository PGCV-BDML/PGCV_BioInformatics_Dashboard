-- ============================================================
-- 20260818120000_repository_category_notion_values.sql
--
-- Adds Notion repository categories to public.repository_category.
-- Existing values (pipelines, datasets, client_sequences,
-- turnover_forms, other) are left in place.
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'training';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'research';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'collaborator';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'quotation';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'services';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'records';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'analysis';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'template';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'automated_pipeline';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'form';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'internship';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'covid_19';
ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'project';
