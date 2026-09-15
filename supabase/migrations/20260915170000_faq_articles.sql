-- Staff FAQ catalog: one question, one answer, editable, with last-updated
-- metadata. Separate from the Forum (faq_thread / faq_post).

CREATE TABLE IF NOT EXISTS public.faq_article (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  author_id uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faq_article_pkey PRIMARY KEY (id),
  CONSTRAINT faq_article_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT faq_article_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT faq_article_title_chk
    CHECK (char_length(btrim(title)) > 0 AND char_length(title) <= 200),
  CONSTRAINT faq_article_body_chk
    CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 20000)
);

CREATE INDEX IF NOT EXISTS idx_faq_article_updated_at
  ON public.faq_article USING btree (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_faq_article_author_id
  ON public.faq_article USING btree (author_id);

CREATE TABLE IF NOT EXISTS public.faq_article_tag (
  article_id uuid NOT NULL,
  tag text NOT NULL,
  CONSTRAINT faq_article_tag_pkey PRIMARY KEY (article_id, tag),
  CONSTRAINT faq_article_tag_article_id_fkey
    FOREIGN KEY (article_id) REFERENCES public.faq_article (id) ON DELETE CASCADE,
  CONSTRAINT faq_article_tag_chk
    CHECK (tag = ANY (ARRAY[
      'installation'::text,
      'conda'::text,
      'python'::text,
      'metabarcoding'::text,
      'amplicon'::text,
      'wgs'::text,
      'rna-seq'::text,
      'phylogenetics'::text,
      'troubleshooting'::text,
      'biology'::text,
      'hpc'::text,
      'advice'::text,
      'programming'::text
    ]))
);

CREATE INDEX IF NOT EXISTS idx_faq_article_tag_tag
  ON public.faq_article_tag USING btree (tag);

CREATE OR REPLACE FUNCTION public.faq_article_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := COALESCE(NEW.author_id, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, NEW.author_id, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.author_id := OLD.author_id;
    NEW.created_at := OLD.created_at;
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faq_article_before_write ON public.faq_article;
CREATE TRIGGER faq_article_before_write
  BEFORE INSERT OR UPDATE ON public.faq_article
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_article_before_write();

DROP TRIGGER IF EXISTS set_updated_at ON public.faq_article;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.faq_article
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.faq_article ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_article_tag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_article select staff" ON public.faq_article;
CREATE POLICY "faq_article select staff"
  ON public.faq_article FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_article insert staff own" ON public.faq_article;
CREATE POLICY "faq_article insert staff own"
  ON public.faq_article FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "faq_article update staff" ON public.faq_article;
CREATE POLICY "faq_article update staff"
  ON public.faq_article FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_article delete own or lead" ON public.faq_article;
CREATE POLICY "faq_article delete own or lead"
  ON public.faq_article FOR DELETE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faq_article_tag select staff" ON public.faq_article_tag;
CREATE POLICY "faq_article_tag select staff"
  ON public.faq_article_tag FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_article_tag write staff" ON public.faq_article_tag;
CREATE POLICY "faq_article_tag write staff"
  ON public.faq_article_tag FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_article_tag delete staff" ON public.faq_article_tag;
CREATE POLICY "faq_article_tag delete staff"
  ON public.faq_article_tag FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.faq_article TO authenticated;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.faq_article_tag TO authenticated;
