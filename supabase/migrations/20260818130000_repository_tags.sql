-- ============================================================
-- 20260818130000_repository_tags.sql
--
-- Multi-select categories for repository links, matching task_tag.
-- The repository.category column is kept as a legacy primary tag.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.repository_tag (
  repository_id uuid NOT NULL REFERENCES public.repository(id) ON DELETE CASCADE,
  category public.repository_category NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (repository_id, category)
);

CREATE INDEX IF NOT EXISTS idx_repository_tag_category
  ON public.repository_tag USING btree (category);

ALTER TABLE public.repository_tag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repository_tag is fully accessible to staff" ON public.repository_tag;
CREATE POLICY "repository_tag is fully accessible to staff"
  ON public.repository_tag FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

INSERT INTO public.repository_tag (repository_id, category)
SELECT id, category
FROM public.repository
ON CONFLICT DO NOTHING;
