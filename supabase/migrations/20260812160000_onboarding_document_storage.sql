-- ============================================================
-- 20260812160000_onboarding_document_storage.sql
--
-- Staff can attach either an external link or an uploaded file
-- to training/internship onboarding documents. Uploaded files
-- live in a private bucket; the app opens them via short-lived
-- signed URLs. Object keys are `{program_id}/{unix_ms}-{slug}.ext`
-- so enrolled learners can read only their cohort's materials.
-- ============================================================

ALTER TABLE public.onboarding_document
  ADD COLUMN IF NOT EXISTS file_path text NULL,
  ADD COLUMN IF NOT EXISTS file_name text NULL,
  ADD COLUMN IF NOT EXISTS file_size bigint NULL;

COMMENT ON COLUMN public.onboarding_document.file_path IS
  'Object key in the onboarding-documents bucket when a file was uploaded.';
COMMENT ON COLUMN public.onboarding_document.link IS
  'External URL when the document is linked instead of uploaded.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-documents',
  'onboarding-documents',
  false,
  26214400, -- 25 MB; mirrored by MAX_ONBOARDING_FILE_BYTES
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "onboarding documents readable by staff and enrolled learners"
  ON storage.objects;
CREATE POLICY "onboarding documents readable by staff and enrolled learners"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'onboarding-documents'
    AND (
      public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
      OR (
        public.get_user_role()::text = ANY (ARRAY['trainee', 'intern'])
        AND public.is_enrolled_in_program(
          ((storage.foldername(name))[1])::uuid
        )
      )
    )
  );

DROP POLICY IF EXISTS "onboarding documents writable by staff" ON storage.objects;
CREATE POLICY "onboarding documents writable by staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding-documents'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "onboarding documents updatable by staff" ON storage.objects;
CREATE POLICY "onboarding documents updatable by staff"
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
CREATE POLICY "onboarding documents deletable by staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'onboarding-documents'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );
