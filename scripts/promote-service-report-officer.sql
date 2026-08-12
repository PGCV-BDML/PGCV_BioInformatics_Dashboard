-- Assign an external reviewing or approving officer role.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor), not from the app.
-- public.users carries a protect_user_role trigger that only lets an existing
-- team_lead change the role column. In the SQL editor auth.uid() is NULL, so
-- the first assignment can be done here; afterwards a team_lead can UPDATE
-- roles from any client that uses their session.
--
-- Officers only see Notifications. They act on service reports assigned to
-- them as Reviewing Officer (reviewing_officer) or Approving Officer
-- (approving_officer). Apply migration 20260812140000_service_report_officer_roles.sql
-- before running this script.
--
-- Replace you@example.com and the role value before running.


-- 1. Confirm the auth login is wired to a profile row.
SELECT
  au.id    AS auth_id,
  au.email AS auth_email,
  pu.id    AS profile_id,
  pu.role  AS current_role
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'you@example.com';


-- 2. Assign the officer role (pick one).
UPDATE public.users
SET role = 'reviewing_officer'   -- or 'approving_officer'
WHERE email = 'you@example.com';


-- 3. Verify.
SELECT id, name, email, role
FROM public.users
WHERE email = 'you@example.com';
