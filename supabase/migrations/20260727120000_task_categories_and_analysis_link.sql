-- ============================================================
-- Task categories (multi-select tags) + analysis link
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.task_category AS ENUM (
    'client_communication',
    'code_workflow_optimization',
    'sequence_analysis',
    'tour',
    'meeting',
    'internship',
    'collaboration',
    'engagements',
    'projects',
    'professional_development',
    'future_planning',
    'skill_development'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS linked_analysis_id uuid NULL;

DO $$ BEGIN
  ALTER TABLE public.task
    ADD CONSTRAINT task_linked_analysis_id_fkey
    FOREIGN KEY (linked_analysis_id) REFERENCES public.analysis(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS task_linked_analysis_id_uidx
  ON public.task (linked_analysis_id)
  WHERE linked_analysis_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.task_tag (
  task_id uuid NOT NULL REFERENCES public.task(id) ON DELETE CASCADE,
  category public.task_category NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (task_id, category)
);

CREATE INDEX IF NOT EXISTS idx_task_tag_category ON public.task_tag USING btree (category);

ALTER TABLE public.task_tag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_tag read all authenticated" ON public.task_tag;
CREATE POLICY "task_tag read all authenticated"
  ON public.task_tag FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_tag insert staff" ON public.task_tag;
CREATE POLICY "task_tag insert staff"
  ON public.task_tag FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task_tag update staff" ON public.task_tag;
CREATE POLICY "task_tag update staff"
  ON public.task_tag FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task_tag delete staff" ON public.task_tag;
CREATE POLICY "task_tag delete staff"
  ON public.task_tag FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));
