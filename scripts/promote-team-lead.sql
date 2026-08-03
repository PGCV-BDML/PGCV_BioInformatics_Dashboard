-- Promote a staff account to team_lead so it can manage the bioinformatics roster.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor), not from the app.
-- public.users carries a protect_user_role trigger that only lets an existing
-- team_lead change the role column. In the SQL editor auth.uid() is NULL, so
-- get_user_role() returns NULL, the trigger's check evaluates to NULL rather
-- than true, and the update is allowed. That is the only way to seed the first
-- team lead.
--
-- Replace you@example.com in steps 2-4 before running.


-- 1. Does the roster column exist? The Team page filters on in_team_directory,
--    so a zero-row result here means migration 20260803140000_user_team_directory.sql
--    has not been applied yet and the page will fail to load its member list.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'in_team_directory';


-- 2. Confirm the login is wired to a profile row. The app looks up public.users
--    by auth.uid(), so profile_id must not be NULL. A NULL means the profile row
--    was created with a different id than the auth account and no role change
--    will have any effect until the ids match.
SELECT
  au.id    AS auth_id,
  au.email AS auth_email,
  pu.id    AS profile_id,
  pu.role  AS current_role
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'you@example.com';


-- 3. Promote to team_lead.
UPDATE public.users
SET role = 'team_lead'
WHERE email = 'you@example.com';


-- 4. Verify. Expect role = team_lead and in_team_directory = true.
SELECT id, name, email, role, in_team_directory
FROM public.users
WHERE email = 'you@example.com';
