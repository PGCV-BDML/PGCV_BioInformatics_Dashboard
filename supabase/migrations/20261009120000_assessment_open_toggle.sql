-- Let staff open or close each pre/post test, and make test submissions
-- final: a learner gets one submission per pre-test and post-test.

ALTER TABLE public.assessment
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

-- Post-tests start closed until staff open them. Leave a post-test open if
-- learners have already submitted it, so a running program isn't cut off.
UPDATE public.assessment a
SET is_open = false
WHERE a.type = 'post_test'::assessment_type
  AND NOT EXISTS (
    SELECT 1 FROM public.assessment_response r
    WHERE r.assessment_id = a.id
  );

-- Learners can only submit to an open assessment, and only once per pre/post
-- test. Evaluations keep allowing repeat submissions. Learners still have no
-- UPDATE policy, so a submitted response can't be changed.
DROP POLICY IF EXISTS "assessment_response insert participant" ON public.assessment_response;
CREATE POLICY "assessment_response insert participant"
  ON public.assessment_response FOR INSERT TO authenticated
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assessment a
      WHERE a.id = assessment_response.assessment_id
        AND a.is_open
        AND (
          a.type = 'evaluation'::assessment_type
          OR NOT EXISTS (
            SELECT 1 FROM public.assessment_response r
            WHERE r.assessment_id = a.id
              AND r.participant_id = auth.uid()
          )
        )
    )
  );
