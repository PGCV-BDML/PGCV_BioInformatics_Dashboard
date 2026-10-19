-- Staff open or close each module and presentation. Trainees and interns
-- can open a material only while it is open. Existing rows stay open so a
-- running program is not locked until someone flips the switch.

ALTER TABLE public.module
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

ALTER TABLE public.presentation
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.module.is_open IS
  'When false, enrolled trainees and interns cannot open this module. Staff can still open it.';

COMMENT ON COLUMN public.presentation.is_open IS
  'When false, enrolled trainees and interns cannot open this presentation. Staff can still open it.';

-- Uploaded module files were readable by any enrolled learner. A closed
-- module's file is staff-only until it is opened again.
DROP POLICY IF EXISTS "module files readable by staff and enrolled learners"
  ON storage.objects;
CREATE POLICY "module files readable by staff and enrolled learners"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'module-files'
    AND (
      public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
      OR (
        public.get_user_role()::text = ANY (ARRAY['trainee', 'intern'])
        AND EXISTS (
          SELECT 1
          FROM public.module m
          WHERE m.file_path = storage.objects.name
            AND m.is_open
            AND public.is_enrolled_in_program(m.program_id)
        )
      )
    )
  );
