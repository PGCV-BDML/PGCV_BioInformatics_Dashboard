-- ============================================================
-- 20260806130001_user_signature_storage.sql
--
-- Private bucket for handwritten e-signature images. Keys are
-- `{user_id}/{unix_ms}-signature.png`. Staff can read any
-- signature (needed when stamping a report), but each user may
-- only write/replace their own.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-signatures',
  'user-signatures',
  false,
  2097152, -- 2 MB
  ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "user signatures readable by staff" ON storage.objects;
CREATE POLICY "user signatures readable by staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
  );

DROP POLICY IF EXISTS "user signatures insert own" ON storage.objects;
CREATE POLICY "user signatures insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user signatures update own" ON storage.objects;
CREATE POLICY "user signatures update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user signatures delete own" ON storage.objects;
CREATE POLICY "user signatures delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
