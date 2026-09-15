-- Tighten FAQ / Forum tags to the shared catalog. Remap retired values
-- (conda → installation, python → programming, rna-seq → transcriptomics)
-- and drop biology / advice.

ALTER TABLE public.faq_tag
  DROP CONSTRAINT IF EXISTS faq_tag_chk;

ALTER TABLE public.faq_article_tag
  DROP CONSTRAINT IF EXISTS faq_article_tag_chk;

ALTER TABLE public.faq_article_revision
  DROP CONSTRAINT IF EXISTS faq_article_revision_tags_chk;

INSERT INTO public.faq_tag (thread_id, tag)
SELECT thread_id, 'installation'
FROM public.faq_tag
WHERE tag = 'conda'
ON CONFLICT DO NOTHING;

INSERT INTO public.faq_tag (thread_id, tag)
SELECT thread_id, 'programming'
FROM public.faq_tag
WHERE tag = 'python'
ON CONFLICT DO NOTHING;

INSERT INTO public.faq_tag (thread_id, tag)
SELECT thread_id, 'transcriptomics'
FROM public.faq_tag
WHERE tag = 'rna-seq'
ON CONFLICT DO NOTHING;

DELETE FROM public.faq_tag
WHERE tag NOT IN (
  'metabarcoding',
  'amplicon',
  'wgs',
  'transcriptomics',
  'phylogenetics',
  'metagenomics',
  'covid-19',
  'installation',
  'hpc',
  'troubleshooting',
  'programming'
);

INSERT INTO public.faq_article_tag (article_id, tag)
SELECT article_id, 'installation'
FROM public.faq_article_tag
WHERE tag = 'conda'
ON CONFLICT DO NOTHING;

INSERT INTO public.faq_article_tag (article_id, tag)
SELECT article_id, 'programming'
FROM public.faq_article_tag
WHERE tag = 'python'
ON CONFLICT DO NOTHING;

INSERT INTO public.faq_article_tag (article_id, tag)
SELECT article_id, 'transcriptomics'
FROM public.faq_article_tag
WHERE tag = 'rna-seq'
ON CONFLICT DO NOTHING;

DELETE FROM public.faq_article_tag
WHERE tag NOT IN (
  'metabarcoding',
  'amplicon',
  'wgs',
  'transcriptomics',
  'phylogenetics',
  'metagenomics',
  'covid-19',
  'installation',
  'hpc',
  'troubleshooting',
  'programming'
);

UPDATE public.faq_article_revision AS r
SET tags = coalesce((
  SELECT array_agg(DISTINCT x.mapped ORDER BY x.mapped)
  FROM unnest(r.tags) AS t(tag)
  CROSS JOIN LATERAL (
    SELECT CASE t.tag
      WHEN 'conda' THEN 'installation'::text
      WHEN 'python' THEN 'programming'
      WHEN 'rna-seq' THEN 'transcriptomics'
      WHEN 'biology' THEN NULL
      WHEN 'advice' THEN NULL
      ELSE t.tag
    END AS mapped
  ) x
  WHERE x.mapped IN (
    'metabarcoding',
    'amplicon',
    'wgs',
    'transcriptomics',
    'phylogenetics',
    'metagenomics',
    'covid-19',
    'installation',
    'hpc',
    'troubleshooting',
    'programming'
  )
), ARRAY[]::text[]);

ALTER TABLE public.faq_tag
  ADD CONSTRAINT faq_tag_chk
  CHECK (tag = ANY (ARRAY[
    'metabarcoding'::text,
    'amplicon'::text,
    'wgs'::text,
    'transcriptomics'::text,
    'phylogenetics'::text,
    'metagenomics'::text,
    'covid-19'::text,
    'installation'::text,
    'hpc'::text,
    'troubleshooting'::text,
    'programming'::text
  ]));

ALTER TABLE public.faq_article_tag
  ADD CONSTRAINT faq_article_tag_chk
  CHECK (tag = ANY (ARRAY[
    'metabarcoding'::text,
    'amplicon'::text,
    'wgs'::text,
    'transcriptomics'::text,
    'phylogenetics'::text,
    'metagenomics'::text,
    'covid-19'::text,
    'installation'::text,
    'hpc'::text,
    'troubleshooting'::text,
    'programming'::text
  ]));

ALTER TABLE public.faq_article_revision
  ADD CONSTRAINT faq_article_revision_tags_chk
  CHECK (tags <@ ARRAY[
    'metabarcoding'::text,
    'amplicon'::text,
    'wgs'::text,
    'transcriptomics'::text,
    'phylogenetics'::text,
    'metagenomics'::text,
    'covid-19'::text,
    'installation'::text,
    'hpc'::text,
    'troubleshooting'::text,
    'programming'::text
  ]::text[]);
