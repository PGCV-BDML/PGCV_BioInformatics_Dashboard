-- P2-12: add `institution` column to `users` so the participants pages can
-- show a real value instead of "—".
--
-- Nullable text column. RLS unchanged (no new policy needed; existing
-- "row owner OR staff" policies already cover selects/updates). The
-- `protect_user_role` trigger does not interact with this column.
--
-- Existing 9 users will have `institution = NULL`; staff can populate via
-- the Dashboard or the Supabase Studio.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS institution text;
