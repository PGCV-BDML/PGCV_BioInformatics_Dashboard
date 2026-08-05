-- ============================================================
-- 20260806120001_service_report_storage.sql
--
-- Storage bucket for uploaded service report PDFs. This is the
-- first use of Supabase Storage in this project.
--
-- The bucket is private: reports carry client data, and a public
-- bucket would make every report readable by anyone holding the
-- URL. The app reads files through short-lived signed URLs
-- instead (see lib/service-report-file.ts).
--
-- Object keys are `{analysis_id}/{unix_ms}-{slug}.pdf`. Uploads
-- never overwrite: a revision gets a new key, so the version a
-- reviewer commented on stays retrievable.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-reports',
  'service-reports',
  false,
  26214400, -- 25 MB; mirrored by MAX_REPORT_BYTES in lib/service-report-file.ts
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Same staff-only boundary as the analysis rows these files hang off.
-- Trainees and interns can reach the dashboard but never client reports.
DROP POLICY IF EXISTS "service reports readable by staff" ON storage.objects;
CREATE POLICY "service reports readable by staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'service-reports'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "service reports writable by staff" ON storage.objects;
CREATE POLICY "service reports writable by staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'service-reports'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "service reports updatable by staff" ON storage.objects;
CREATE POLICY "service reports updatable by staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'service-reports'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  )
  WITH CHECK (
    bucket_id = 'service-reports'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );

DROP POLICY IF EXISTS "service reports deletable by staff" ON storage.objects;
CREATE POLICY "service reports deletable by staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'service-reports'
    AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
  );
