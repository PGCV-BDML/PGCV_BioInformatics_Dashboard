-- ============================================================
-- 20260718000000_audit_session_rpc.sql
-- Adds an RPC for the frontend to log user_login / user_logout
-- events. audit_log RLS is team_lead read-only, so the client
-- can't insert directly; this SECURITY DEFINER function
-- bypasses RLS for the authenticated caller only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_session_event(
  event_type text,
  event_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
BEGIN
  -- Validate event_type against the audit_log_action enum.
  -- This stops the client from inserting arbitrary action strings.
  IF event_type NOT IN ('user_login', 'user_logout') THEN
    RAISE EXCEPTION 'Invalid event_type: %. Must be user_login or user_logout.', event_type;
  END IF;

  -- Get the authenticated user from the JWT.
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'audit_session_event must be called by an authenticated user';
  END IF;

  -- Insert into audit_log. target_type='session', target_id=caller id.
  INSERT INTO public.audit_log (user_id, action, target_type, target_id, details)
  VALUES (
    caller_id,
    event_type::public.audit_log_action,
    'session',
    caller_id::text,
    event_details
  );
END;
$$;

-- Grant execute to authenticated users only.
REVOKE ALL ON FUNCTION public.audit_session_event(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_session_event(text, jsonb) TO authenticated;
