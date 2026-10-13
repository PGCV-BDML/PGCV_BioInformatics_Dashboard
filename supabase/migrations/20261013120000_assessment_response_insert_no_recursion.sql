-- Fix "infinite recursion detected in policy for relation assessment_response".
--
-- 20261009120000_assessment_open_toggle.sql made the learner INSERT policy
-- query assessment_response from inside its own policy (the one-submission
-- check). Postgres rejects that whenever the table's SELECT policies also
-- contain a subquery, as production's do, so every learner submission failed:
-- pre-tests, post-tests and evaluations.
--
-- Move the whole check into a SECURITY DEFINER function, like
-- is_enrolled_in_program(). It reads assessment and assessment_response
-- without going back through RLS, so the policy no longer refers to its own
-- table. The rules are unchanged: the test must be open, a pre/post test takes
-- one submission (evaluations allow repeats), and learners can only submit to
-- programs they are enrolled in. Staff can still submit, e.g. in learner
-- preview.

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
      AND (
        a.type = 'evaluation'::assessment_type
        OR NOT EXISTS (
          SELECT 1
          FROM public.assessment_response r
          WHERE r.assessment_id = a.id
            AND r.participant_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_submit_assessment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_submit_assessment(uuid) TO authenticated;

DROP POLICY IF EXISTS "assessment_response insert participant" ON public.assessment_response;
CREATE POLICY "assessment_response insert participant"
  ON public.assessment_response FOR INSERT TO authenticated
  WITH CHECK (
    participant_id = auth.uid()
    AND public.can_submit_assessment(assessment_id)
  );
