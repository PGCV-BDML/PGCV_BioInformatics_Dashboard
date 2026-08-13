-- ============================================================
-- 20260813140000_module_file_storage.sql
--
-- Staff can add training/internship modules from the prepared
-- HTML library or by uploading a file. Uploaded files live in a
-- private bucket; the app opens them via short-lived signed URLs.
-- Object keys are `{program_id}/{unix_ms}-{slug}.ext` so enrolled
-- learners can read only their cohort's materials.
-- ============================================================

ALTER TABLE public.module
  ADD COLUMN IF NOT EXISTS file_path text NULL,
  ADD COLUMN IF NOT EXISTS file_name text NULL,
  ADD COLUMN IF NOT EXISTS file_size bigint NULL;

COMMENT ON COLUMN public.module.html_content_link IS
  'Public path to a prepared HTML module in the library, e.g. /assets/Training/….';
COMMENT ON COLUMN public.module.file_path IS
  'Object key in the module-files bucket when a file was uploaded instead of a library HTML.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'module-files',
  'module-files',
  false,
  52428800, -- 50 MB; mirrored by MAX_MODULE_FILE_BYTES
  ARRAY[
    'text/html',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

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
        AND public.is_enrolled_in_program(
          ((storage.foldername(name))[1])::uuid
        )
      )
    )
  );

DROP POLICY IF EXISTS "module files writable by staff" ON storage.objects;
CREATE POLICY "module files writable by staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'module-files'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "module files updatable by staff" ON storage.objects;
CREATE POLICY "module files updatable by staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'module-files'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  )
  WITH CHECK (
    bucket_id = 'module-files'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "module files deletable by staff" ON storage.objects;
CREATE POLICY "module files deletable by staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'module-files'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );
