-- ============================================================
-- 20260914120000_repository_journal_hub_drop_github_kind.sql
--
-- Adds 'journal_hub' to public.repository_category and drops
-- 'github' from public.repository_kind (existing github rows
-- are remapped to 'other').
--
-- Not wrapped in BEGIN/COMMIT: ALTER TYPE ... ADD VALUE must not
-- share a transaction with statements that use the new value.
--
-- Idempotent; safe to re-run.
-- ============================================================

ALTER TYPE public.repository_category ADD VALUE IF NOT EXISTS 'journal_hub';

UPDATE public.repository
SET kind = 'other'
WHERE kind::text = 'github';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'repository_kind'
      AND e.enumlabel = 'github'
  ) THEN
    EXECUTE 'ALTER TYPE public.repository_kind RENAME TO repository_kind_old';
    EXECUTE 'CREATE TYPE public.repository_kind AS ENUM (''drive'', ''other'')';
    EXECUTE 'ALTER TABLE public.repository ALTER COLUMN kind DROP DEFAULT';
    EXECUTE $sql$
      ALTER TABLE public.repository
        ALTER COLUMN kind TYPE public.repository_kind
        USING kind::text::public.repository_kind
    $sql$;
    EXECUTE 'ALTER TABLE public.repository ALTER COLUMN kind SET DEFAULT ''other''::public.repository_kind';
    EXECUTE 'DROP TYPE public.repository_kind_old';
  END IF;
END $$;
