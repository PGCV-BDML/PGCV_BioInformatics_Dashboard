-- ============================================================
-- 20260806130000_user_signatures.sql
--
-- Electronic signatures for reviewing / approving officers.
-- Stored as private PNGs; stamped onto service report PDFs when
-- a review is completed or an approval is granted.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signature_path        text        NULL,
  ADD COLUMN IF NOT EXISTS signature_uploaded_at timestamptz NULL;

COMMENT ON COLUMN public.users.signature_path IS
  'Object key in the user-signatures bucket for this user''s e-signature PNG.';
