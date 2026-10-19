-- Slide decks attached to a training program, sourced from the private
-- bioinfo-presentations repo. content_link stores github-presentation:<id>
-- from presentations.json so renaming the HTML file does not break a course.
-- Rows cascade when a program is deleted.

CREATE TABLE IF NOT EXISTS public.presentation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  title text NOT NULL,
  content_link text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT presentation_pkey PRIMARY KEY (id),
  CONSTRAINT presentation_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.training_program (id) ON DELETE CASCADE,
  CONSTRAINT presentation_program_id_order_key UNIQUE (program_id, "order"),
  CONSTRAINT presentation_title_chk
    CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT presentation_content_link_chk
    CHECK (content_link ~ '^github-presentation:[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')
);

CREATE INDEX IF NOT EXISTS idx_presentation_program_id
  ON public.presentation USING btree (program_id, "order");

ALTER TABLE public.presentation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presentation select" ON public.presentation;
CREATE POLICY "presentation select"
  ON public.presentation FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND is_enrolled_in_program(program_id)
    )
  );

DROP POLICY IF EXISTS "presentation insert staff" ON public.presentation;
CREATE POLICY "presentation insert staff"
  ON public.presentation FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "presentation update staff" ON public.presentation;
CREATE POLICY "presentation update staff"
  ON public.presentation FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "presentation delete staff" ON public.presentation;
CREATE POLICY "presentation delete staff"
  ON public.presentation FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.presentation TO authenticated;

DROP TRIGGER IF EXISTS set_updated_at ON public.presentation;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.presentation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.presentation IS
  'Slide decks attached to a training program. content_link is github-presentation:<id> from bioinfo-presentations presentations.json.';

COMMENT ON COLUMN public.presentation.content_link IS
  'github-presentation:<id>, where id is the presentations.json id. The HTML path is looked up when the deck is opened.';
