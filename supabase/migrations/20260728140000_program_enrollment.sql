-- ============================================================
-- program_enrollment + learner-scoped RLS
-- - Assign trainees/interns to programs (team_lead only writes)
-- - Learners only see enrolled programs and related content
-- - Ops tables (project/service/task/task_tag) become staff-read
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM (
    'enrolled',
    'completed',
    'dropped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.program_enrollment (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_program(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'enrolled'::public.enrollment_status,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  enrolled_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT program_enrollment_pkey PRIMARY KEY (id),
  CONSTRAINT program_enrollment_program_user_uidx UNIQUE (program_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_program_enrollment_user_id
  ON public.program_enrollment (user_id);

CREATE INDEX IF NOT EXISTS idx_program_enrollment_program_id
  ON public.program_enrollment (program_id);

ALTER TABLE public.program_enrollment ENABLE ROW LEVEL SECURITY;

-- Active enrollment helper (enrolled or completed still grants access)
CREATE OR REPLACE FUNCTION public.is_enrolled_in_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_enrollment pe
    WHERE pe.program_id = p_program_id
      AND pe.user_id = auth.uid()
      AND pe.status = ANY (
        ARRAY[
          'enrolled'::public.enrollment_status,
          'completed'::public.enrollment_status
        ]
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_enrolled_in_program(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_program(uuid) TO authenticated;

-- updated_at trigger
DROP TRIGGER IF EXISTS program_enrollment_set_updated_at ON public.program_enrollment;
CREATE TRIGGER program_enrollment_set_updated_at
  BEFORE UPDATE ON public.program_enrollment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ===== users: learners may read staff profiles (instructor/mentor names) =====
DROP POLICY IF EXISTS "users select" ON public.users;
CREATE POLICY "users select"
  ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND role = ANY (
        ARRAY['team_lead'::public.user_roles, 'team_member'::public.user_roles]
      )
    )
  );

-- ===== program_enrollment policies =====
DROP POLICY IF EXISTS "program_enrollment select" ON public.program_enrollment;
CREATE POLICY "program_enrollment select"
  ON public.program_enrollment FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "program_enrollment insert team_lead" ON public.program_enrollment;
CREATE POLICY "program_enrollment insert team_lead"
  ON public.program_enrollment FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'team_lead'::text);

DROP POLICY IF EXISTS "program_enrollment update team_lead" ON public.program_enrollment;
CREATE POLICY "program_enrollment update team_lead"
  ON public.program_enrollment FOR UPDATE TO authenticated
  USING (get_user_role() = 'team_lead'::text)
  WITH CHECK (get_user_role() = 'team_lead'::text);

DROP POLICY IF EXISTS "program_enrollment delete team_lead" ON public.program_enrollment;
CREATE POLICY "program_enrollment delete team_lead"
  ON public.program_enrollment FOR DELETE TO authenticated
  USING (get_user_role() = 'team_lead'::text);

-- ===== training_program: learners only see enrolled programs =====
DROP POLICY IF EXISTS "training_program select" ON public.training_program;
CREATE POLICY "training_program select"
  ON public.training_program FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      type = 'training'::training_type
      AND get_user_role() = 'trainee'::text
      AND is_enrolled_in_program(id)
    )
    OR (
      type = 'internship'::training_type
      AND get_user_role() = 'intern'::text
      AND is_enrolled_in_program(id)
    )
  );

-- ===== assessment: enrolled learners only =====
DROP POLICY IF EXISTS "assessment participant read" ON public.assessment;
CREATE POLICY "assessment participant read"
  ON public.assessment FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND is_enrolled_in_program(program_id)
    )
  );

-- ===== training_session: enrolled learners only =====
DROP POLICY IF EXISTS "training_session select" ON public.training_session;
CREATE POLICY "training_session select"
  ON public.training_session FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND is_enrolled_in_program(program_id)
    )
  );

-- ===== module: enrolled learners only =====
DROP POLICY IF EXISTS "module select" ON public.module;
CREATE POLICY "module select"
  ON public.module FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND is_enrolled_in_program(program_id)
    )
  );

-- ===== onboarding_document: enrolled learners only =====
DROP POLICY IF EXISTS "onboarding_document select" ON public.onboarding_document;
CREATE POLICY "onboarding_document select"
  ON public.onboarding_document FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR (
      get_user_role() = ANY (ARRAY['trainee'::text, 'intern'::text])
      AND is_enrolled_in_program(program_id)
    )
  );

-- ===== ops tables: staff-only reads =====
DROP POLICY IF EXISTS "project read all authenticated" ON public.project;
CREATE POLICY "project read staff"
  ON public.project FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "service read all authenticated" ON public.service;
CREATE POLICY "service read staff"
  ON public.service FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task read all authenticated" ON public.task;
CREATE POLICY "task read staff"
  ON public.task FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task_tag read all authenticated" ON public.task_tag;
CREATE POLICY "task_tag read staff"
  ON public.task_tag FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));
