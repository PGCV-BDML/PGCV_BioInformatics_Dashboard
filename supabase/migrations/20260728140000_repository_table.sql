-- Restore first-class repository records (independent of project/collaboration).
-- Optional run_id deep-links into Service Report Tracker (analysis.run_id).

DO $$ BEGIN
  CREATE TYPE public.repository_kind AS ENUM ('github', 'drive', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.repository_category AS ENUM (
    'pipelines',
    'datasets',
    'client_sequences',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.repository (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind public.repository_kind NOT NULL DEFAULT 'other',
  title text NOT NULL,
  url text NOT NULL,
  description text NULL,
  category public.repository_category NOT NULL DEFAULT 'other',
  run_id text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT repository_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_repository_category
  ON public.repository USING btree (category);

CREATE INDEX IF NOT EXISTS idx_repository_run_id
  ON public.repository (run_id)
  WHERE run_id IS NOT NULL;

ALTER TABLE public.repository ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repository is fully accessible to staff" ON public.repository;
CREATE POLICY "repository is fully accessible to staff"
  ON public.repository FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP TRIGGER IF EXISTS set_updated_at ON public.repository;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.repository
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
