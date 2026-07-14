-- ============================================================
-- 22_rls_policies.sql
-- All RLS policies for the 18 public tables. Mirrors the live
-- Supabase state exactly. Policies are grouped by table.
-- Conventions:
--   * Staff = team_lead OR team_member
--   * Trainee may read training-type records they participate in
--   * Intern may read internship-type records they participate in
--   * audit_log is team_lead-only readable, never writable
-- ============================================================

-- ===== users =====
CREATE POLICY "users select"
  ON public.users FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])));

CREATE POLICY "users update"
  ON public.users FOR UPDATE TO authenticated
  USING ((id = auth.uid()) OR (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])))
  WITH CHECK ((id = auth.uid()) OR (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])));

-- ===== audit_log =====
CREATE POLICY "audit_log select team_lead only"
  ON public.audit_log FOR SELECT TO authenticated
  USING (get_user_role() = 'team_lead'::text);

-- Note: audit_log has no INSERT/UPDATE/DELETE policies — writes
-- happen server-side via the audit_table_change() trigger function.

-- ===== analysis =====
CREATE POLICY "analysis is fully accessible to staff"
  ON public.analysis FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== assessment =====
CREATE POLICY "assessment participant read"
  ON public.assessment FOR SELECT TO authenticated
  USING (
    (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
    OR (EXISTS (
      SELECT 1 FROM training_program tp
      WHERE tp.id = assessment.program_id
        AND (
          (tp.type = 'training'::training_type AND get_user_role() = 'trainee'::text)
          OR (tp.type = 'internship'::training_type AND get_user_role() = 'intern'::text)
        )
    ))
  );

CREATE POLICY "assessment write staff"
  ON public.assessment FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "assessment update staff"
  ON public.assessment FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "assessment delete staff"
  ON public.assessment FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== assessment_response =====
CREATE POLICY "assessment_response select"
  ON public.assessment_response FOR SELECT TO authenticated
  USING (
    (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
    OR (participant_id = auth.uid())
  );

CREATE POLICY "assessment_response insert participant"
  ON public.assessment_response FOR INSERT TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "assessment_response write staff"
  ON public.assessment_response FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== certificate =====
CREATE POLICY "certificate select"
  ON public.certificate FOR SELECT TO authenticated
  USING (
    (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND participant_id = auth.uid()
    )
  );

CREATE POLICY "certificate insert staff"
  ON public.certificate FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "certificate update staff"
  ON public.certificate FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "certificate delete staff"
  ON public.certificate FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== client =====
CREATE POLICY "staff has full access to client"
  ON public.client FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== collaboration =====
CREATE POLICY "collaboration is fully accessible to staff"
  ON public.collaboration FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== document_template =====
CREATE POLICY "staff has full access to document_templates"
  ON public.document_template FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== module =====
CREATE POLICY "module select"
  ON public.module FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text, 'trainee'::text, 'intern'::text]));

CREATE POLICY "module insert staff"
  ON public.module FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "module update staff"
  ON public.module FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "module delete staff"
  ON public.module FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== onboarding_document =====
CREATE POLICY "onboarding_document select"
  ON public.onboarding_document FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text, 'trainee'::text, 'intern'::text]));

CREATE POLICY "onboarding_document insert staff"
  ON public.onboarding_document FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "onboarding_document update staff"
  ON public.onboarding_document FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "onboarding_document delete staff"
  ON public.onboarding_document FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== project =====
CREATE POLICY "project read all authenticated"
  ON public.project FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "project insert staff"
  ON public.project FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "project update staff"
  ON public.project FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "project delete staff"
  ON public.project FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== sample =====
CREATE POLICY "staff has full access to sample"
  ON public.sample FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== service =====
CREATE POLICY "service read all authenticated"
  ON public.service FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "service insert staff"
  ON public.service FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "service update staff"
  ON public.service FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "service delete staff"
  ON public.service FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== service_report =====
CREATE POLICY "service_report is fully accessible to the staff"
  ON public.service_report FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== task =====
CREATE POLICY "task read all authenticated"
  ON public.task FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "task insert staff"
  ON public.task FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "task update staff"
  ON public.task FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "task delete staff"
  ON public.task FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== training_program =====
CREATE POLICY "training_program select"
  ON public.training_program FOR SELECT TO authenticated
  USING (
    (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
    OR ((type = 'training'::training_type) AND (get_user_role() = 'trainee'::text))
    OR ((type = 'internship'::training_type) AND (get_user_role() = 'intern'::text))
  );

CREATE POLICY "training_program insert staff"
  ON public.training_program FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "training_program update staff"
  ON public.training_program FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "training_program delete staff"
  ON public.training_program FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- ===== training_session =====
CREATE POLICY "training_session select"
  ON public.training_session FOR SELECT TO authenticated
  USING (
    (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
    OR (EXISTS (
      SELECT 1 FROM training_program tp
      WHERE tp.id = training_session.program_id
        AND (
          (tp.type = 'training'::training_type AND get_user_role() = 'trainee'::text)
          OR (tp.type = 'internship'::training_type AND get_user_role() = 'intern'::text)
        )
    ))
  );

CREATE POLICY "training_session insert staff"
  ON public.training_session FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "training_session update staff"
  ON public.training_session FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE POLICY "training_session delete staff"
  ON public.training_session FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));
