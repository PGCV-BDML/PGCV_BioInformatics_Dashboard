-- Staff-only reference links for a training program (Drive folders, letters, etc.).
-- Rows cascade when a program is deleted.

CREATE TABLE IF NOT EXISTS public.training_prep_link (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT training_prep_link_pkey PRIMARY KEY (id),
  CONSTRAINT training_prep_link_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.training_program (id) ON DELETE CASCADE,
  CONSTRAINT training_prep_link_title_chk
    CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT training_prep_link_url_chk
    CHECK (
      char_length(btrim(url)) > 0
      AND url ~* '^https?://'
    )
);

CREATE INDEX IF NOT EXISTS idx_training_prep_link_program_id
  ON public.training_prep_link USING btree (program_id, sort_order);

ALTER TABLE public.training_prep_link ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_prep_link is fully accessible to staff"
  ON public.training_prep_link;
CREATE POLICY "training_prep_link is fully accessible to staff"
  ON public.training_prep_link FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.training_prep_link TO authenticated;

DROP TRIGGER IF EXISTS set_updated_at ON public.training_prep_link;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.training_prep_link
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
