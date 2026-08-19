-- Make evaluation questions 18 (suggestions) and 19 (comments)
-- optional on existing training and internship evaluation forms.

UPDATE public.assessment
SET questions = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' IN ('eval_suggestions', 'eval_comments')
      THEN jsonb_set(elem, '{required}', 'false'::jsonb)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(questions) AS elem
)
WHERE type = 'evaluation'
  AND questions IS NOT NULL;
