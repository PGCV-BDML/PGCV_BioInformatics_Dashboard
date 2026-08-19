-- Allow team leads and team members to delete evaluation (and other
-- assessment) responses, e.g. to remove a test submission.

CREATE POLICY "assessment_response delete staff"
  ON public.assessment_response FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));
