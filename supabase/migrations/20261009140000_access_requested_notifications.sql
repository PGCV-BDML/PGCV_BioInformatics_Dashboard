-- Alert team leads when someone signs in for the first time and is waiting
-- for a role (users.role = 'none'). INSERT into notifications then rides the
-- existing web-push dispatch trigger. Once a role is assigned, the alerts for
-- that person are marked read for every team lead.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_access_requested_once
  ON public.notifications (target_user_id, ((payload->>'user_id')))
  WHERE type = 'access_requested';

CREATE OR REPLACE FUNCTION public.notify_access_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> 'none'::user_roles THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (type, payload, target_user_id)
  SELECT
    'access_requested',
    jsonb_build_object(
      'user_id', NEW.id,
      'user_name', NEW.name,
      'user_email', NEW.email
    ),
    lead.id
  FROM public.users lead
  WHERE lead.role = 'team_lead'::user_roles
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a sign-in because an alert could not be written.
  RAISE WARNING 'notify_access_requested failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_notify_access_requested ON public.users;
CREATE TRIGGER users_notify_access_requested
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_access_requested();

CREATE OR REPLACE FUNCTION public.resolve_access_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE type = 'access_requested'
    AND payload->>'user_id' = NEW.id::text
    AND is_read = false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_resolve_access_requested ON public.users;
CREATE TRIGGER users_resolve_access_requested
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  WHEN (OLD.role = 'none'::user_roles AND NEW.role <> 'none'::user_roles)
  EXECUTE FUNCTION public.resolve_access_requested();
