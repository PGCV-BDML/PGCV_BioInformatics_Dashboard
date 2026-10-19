-- Training files: record who added each onboarding document, and let an
-- enrolled trainee add, edit, and remove only their own items on a training
-- program. The team can still change any item. Existing rows keep a null
-- created_by and stay team-managed.

ALTER TABLE public.onboarding_document
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_document_created_by_fkey'
  ) THEN
    ALTER TABLE public.onboarding_document
      ADD CONSTRAINT onboarding_document_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.onboarding_document.created_by IS
  'User who added the link or file. Null on rows created before this column existed.';

CREATE OR REPLACE FUNCTION public.protect_onboarding_document_author()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by cannot change';
    END IF;
    IF NEW.program_id IS DISTINCT FROM OLD.program_id THEN
      RAISE EXCEPTION 'program_id cannot change';
    END IF;
  END IF;

  IF public.get_user_role()::text = 'trainee' AND NEW.is_required IS TRUE THEN
    RAISE EXCEPTION 'trainees cannot mark a training file required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_onboarding_document_author
  ON public.onboarding_document;
CREATE TRIGGER protect_onboarding_document_author
  BEFORE INSERT OR UPDATE ON public.onboarding_document
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_onboarding_document_author();

DROP POLICY IF EXISTS "onboarding_document insert staff" ON public.onboarding_document;
DROP POLICY IF EXISTS "onboarding_document insert" ON public.onboarding_document;
CREATE POLICY "onboarding_document insert"
  ON public.onboarding_document FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
      OR (
        public.get_user_role()::text = 'trainee'
        AND public.is_enrolled_in_program(program_id)
        AND is_required = false
        AND EXISTS (
          SELECT 1
          FROM public.training_program AS program
          WHERE program.id = program_id
            AND program.type = 'training'::public.training_type
        )
      )
    )
  );

DROP POLICY IF EXISTS "onboarding_document update staff" ON public.onboarding_document;
DROP POLICY IF EXISTS "onboarding_document update" ON public.onboarding_document;
CREATE POLICY "onboarding_document update"
  ON public.onboarding_document FOR UPDATE TO authenticated
  USING (
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    OR (
      public.get_user_role()::text = 'trainee'
      AND created_by = auth.uid()
      AND public.is_enrolled_in_program(program_id)
    )
  )
  WITH CHECK (
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    OR (
      public.get_user_role()::text = 'trainee'
      AND created_by = auth.uid()
      AND is_required = false
      AND public.is_enrolled_in_program(program_id)
    )
  );

DROP POLICY IF EXISTS "onboarding_document delete staff" ON public.onboarding_document;
DROP POLICY IF EXISTS "onboarding_document delete" ON public.onboarding_document;
CREATE POLICY "onboarding_document delete"
  ON public.onboarding_document FOR DELETE TO authenticated
  USING (
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    OR (
      public.get_user_role()::text = 'trainee'
      AND created_by = auth.uid()
      AND public.is_enrolled_in_program(program_id)
    )
  );

-- Trainees can read the name and role of someone who added a file to a
-- training they are enrolled in. Staff already can read every user.
DROP POLICY IF EXISTS "users select training file uploaders" ON public.users;
CREATE POLICY "users select training file uploaders"
  ON public.users FOR SELECT TO authenticated
  USING (
    public.get_user_role()::text = ANY (ARRAY['trainee', 'intern'])
    AND EXISTS (
      SELECT 1
      FROM public.onboarding_document AS doc
      JOIN public.training_program AS program
        ON program.id = doc.program_id
      WHERE doc.created_by = users.id
        AND program.type = 'training'::public.training_type
        AND public.is_enrolled_in_program(doc.program_id)
    )
  );

-- New objects are {program_id}/{user_id}/{file}. Trainees may write and
-- delete only inside their own folder, and only for a program they are in.
-- Older objects have no user folder, so only the team can delete them.
DROP POLICY IF EXISTS "onboarding documents writable by staff" ON storage.objects;
DROP POLICY IF EXISTS "onboarding documents writable" ON storage.objects;
CREATE POLICY "onboarding documents writable"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding-documents'
    AND (
      public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
      OR (
        public.get_user_role()::text = 'trainee'
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND public.is_enrolled_in_program(
          ((storage.foldername(name))[1])::uuid
        )
      )
    )
  );

DROP POLICY IF EXISTS "onboarding documents updatable by staff" ON storage.objects;
DROP POLICY IF EXISTS "onboarding documents updatable" ON storage.objects;
CREATE POLICY "onboarding documents updatable"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'onboarding-documents'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  )
  WITH CHECK (
    bucket_id = 'onboarding-documents'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "onboarding documents deletable by staff" ON storage.objects;
DROP POLICY IF EXISTS "onboarding documents deletable" ON storage.objects;
CREATE POLICY "onboarding documents deletable"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'onboarding-documents'
    AND (
      public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
      OR (
        public.get_user_role()::text = 'trainee'
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND public.is_enrolled_in_program(
          ((storage.foldername(name))[1])::uuid
        )
      )
    )
  );
