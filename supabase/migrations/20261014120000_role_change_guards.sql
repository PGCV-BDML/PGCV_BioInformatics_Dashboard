-- Guard rails for the All users role table on the Access Requests page.
--
-- protect_user_role_column() already lets only team leads change
-- users.role. Team leads can now change anyone's role from the dashboard,
-- so add two more rules here, where a stale tab or a direct API call can't
-- skip them:
--
--   * A team lead can't change their own role. Another lead has to do it,
--     so nobody locks themselves out by accident.
--   * The last team lead can't be demoted. Without a lead, nobody could
--     assign roles again.
--
-- Updates made without a signed-in user (service role, SQL editor) keep
-- skipping the team-lead and own-role checks, as before, but can't remove
-- the last team lead either. The messages are shown to people as-is.

CREATE OR REPLACE FUNCTION public.protect_user_role_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF get_user_role() != 'team_lead' THEN
    RAISE EXCEPTION 'Only team_lead can modify the role column';
  END IF;

  IF NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t change your own role. Ask another team lead to do it.';
  END IF;

  IF OLD.role = 'team_lead' THEN
    -- Two leads demoting each other at the same moment would each still
    -- see the other as a lead. Take turns so the second one sees the first.
    PERFORM pg_advisory_xact_lock(hashtext('public.users.team_lead'));
    IF NOT EXISTS (
      SELECT 1
      FROM public.users
      WHERE role = 'team_lead'
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'At least one team lead is required. Make someone else a team lead first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
