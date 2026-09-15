-- Immutable FAQ catalog snapshots. One row per save that changed
-- title, body, or tags. Staff can read history; they cannot restore.

CREATE TABLE IF NOT EXISTS public.faq_article_revision (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  edited_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faq_article_revision_pkey PRIMARY KEY (id),
  CONSTRAINT faq_article_revision_article_id_fkey
    FOREIGN KEY (article_id) REFERENCES public.faq_article (id) ON DELETE CASCADE,
  CONSTRAINT faq_article_revision_edited_by_fkey
    FOREIGN KEY (edited_by) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT faq_article_revision_version_chk
    CHECK (version >= 1),
  CONSTRAINT faq_article_revision_article_version_key
    UNIQUE (article_id, version),
  CONSTRAINT faq_article_revision_title_chk
    CHECK (char_length(btrim(title)) > 0 AND char_length(title) <= 200),
  CONSTRAINT faq_article_revision_body_chk
    CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 20000),
  CONSTRAINT faq_article_revision_tags_chk
    CHECK (tags <@ ARRAY[
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
    ]::text[])
);

CREATE INDEX IF NOT EXISTS idx_faq_article_revision_article_id
  ON public.faq_article_revision USING btree (article_id, version DESC);

ALTER TABLE public.faq_article_revision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_article_revision select staff" ON public.faq_article_revision;
CREATE POLICY "faq_article_revision select staff"
  ON public.faq_article_revision FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_article_revision insert staff own" ON public.faq_article_revision;
CREATE POLICY "faq_article_revision insert staff own"
  ON public.faq_article_revision FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND edited_by = auth.uid()
  );

GRANT SELECT, INSERT
  ON TABLE public.faq_article_revision TO authenticated;

INSERT INTO public.faq_article_revision (
  article_id,
  version,
  title,
  body,
  tags,
  edited_by,
  created_at
)
SELECT
  a.id,
  1,
  a.title,
  a.body,
  coalesce((
    SELECT array_agg(t.tag ORDER BY t.tag)
    FROM public.faq_article_tag t
    WHERE t.article_id = a.id
  ), ARRAY[]::text[]),
  a.updated_by,
  a.updated_at
FROM public.faq_article a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.faq_article_revision r
  WHERE r.article_id = a.id
);
