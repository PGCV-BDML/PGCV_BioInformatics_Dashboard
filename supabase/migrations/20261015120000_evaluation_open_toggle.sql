-- Let staff open or close the post-activity evaluation, like the pre/post
-- tests, and take one evaluation per learner.
--
-- Evaluations already have is_open (20261009120000_assessment_open_toggle.sql)
-- and can_submit_assessment() already rejects a closed one, but only
-- post-tests were closed back then. Evaluations now start closed until staff
-- open them at the end of a program. Staff hand out certificates after the
-- evaluation, so repeat submissions only skewed the summary averages.

-- Close evaluations nobody has submitted yet. Leave one open if a learner has
-- already submitted it, so a running program isn't cut off. A cleared
-- evaluation (answers wiped to {}) doesn't count as a submission.
UPDATE public.assessment a
SET is_open = false
WHERE a.type = 'evaluation'::assessment_type
  AND a.is_open
  AND NOT EXISTS (
    SELECT 1 FROM public.assessment_response r
    WHERE r.assessment_id = a.id
      AND r.answers IS NOT NULL
      AND r.answers <> '{}'::jsonb
  );

-- Same rules as 20261013120000_assessment_response_insert_no_recursion.sql,
-- except evaluations now take one submission too. Clearing evaluation
-- responses can wipe answers to {} instead of deleting the row, so a cleared
-- evaluation can be submitted again.
CREATE OR REPLACE FUNCTION public.can_submit_assessment(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessment a
    WHERE a.id = p_assessment_id
      AND a.is_open
      AND (
        get_user_role()::text = ANY (ARRAY['team_lead'::text, 'team_member'::text])
        OR is_enrolled_in_program(a.program_id)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.assessment_response r
        WHERE r.assessment_id = a.id
          AND r.participant_id = auth.uid()
          AND (
            a.type <> 'evaluation'::assessment_type
            OR (r.answers IS NOT NULL AND r.answers <> '{}'::jsonb)
          )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_submit_assessment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_submit_assessment(uuid) TO authenticated;
