-- ============================================================
-- 24_updated_at_triggers.sql
-- Auto-update the updated_at column on every row write.
-- NOT present in the live Supabase database as of writing —
-- this migration adds the missing trigger so updated_at
-- reflects the time of the most recent UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Attach to every table that has an updated_at column.
-- audit_log has no updated_at; the rest do.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'client',
    'service',
    'document_template',
    'training_program',
    'project',
    'analysis',
    'assessment',
    'assessment_response',
    'certificate',
    'collaboration',
    'module',
    'onboarding_document',
    'sample',
    'service_report',
    'task',
    'training_session'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();',
      t
    );
  END LOOP;
END;
$$;
