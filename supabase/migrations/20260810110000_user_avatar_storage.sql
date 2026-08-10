-- ============================================================
-- 20260810110000_user_avatar_storage.sql
--
-- Profile photos for the Team directory. Keys are
-- `{user_id}/{unix_ms}-avatar.{ext}`. Public read keeps
-- display simple; writes are limited to the owner or team lead.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_path        text        NULL,
  ADD COLUMN IF NOT EXISTS avatar_uploaded_at timestamptz NULL;

COMMENT ON COLUMN public.users.avatar_path IS
  'Object key in the user-avatars bucket for this user''s profile photo.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  1048576, -- 1 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "user avatars readable by staff" ON storage.objects;
CREATE POLICY "user avatars readable by staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
  );

DROP POLICY IF EXISTS "user avatars insert staff" ON storage.objects;
CREATE POLICY "user avatars insert staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_user_role() = 'team_lead'
    )
  );

DROP POLICY IF EXISTS "user avatars update staff" ON storage.objects;
CREATE POLICY "user avatars update staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_user_role() = 'team_lead'
    )
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_user_role() = 'team_lead'
    )
  );

DROP POLICY IF EXISTS "user avatars delete staff" ON storage.objects;
CREATE POLICY "user avatars delete staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND public.get_user_role()::text = ANY (
      ARRAY['team_lead', 'team_member', 'intern', 'trainee']
    )
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_user_role() = 'team_lead'
    )
  );
