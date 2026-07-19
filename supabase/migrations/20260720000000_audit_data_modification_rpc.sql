-- ============================================================
-- 20260720000000_audit_data_modification_rpc.sql
-- Adds a generic audit_data_modification RPC. audit_log RLS is
-- team_lead read-only, so the client can't insert directly; this
-- SECURITY DEFINER function bypasses RLS for the authenticated
-- caller only. Use for any data write that needs to be auditable
-- (report delivery, sample creation, etc.).
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_data_modification(
  target_type text,
  target_id text,
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
  -- Validate target_type. Must be a sensible value, not arbitrary.
  IF target_type IS NULL OR length(target_type) = 0 OR length(target_type) > 100 THEN
    RAISE EXCEPTION 'Invalid target_type: must be 1-100 characters';
  END IF;

  -- Get the authenticated user from the JWT.
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'audit_data_modification must be called by an authenticated user';
  END IF;

  -- Insert into audit_log.
  INSERT INTO public.audit_log (user_id, action, target_type, target_id, details)
  VALUES (
    caller_id,
    'data_modification'::public.audit_log_action,
    target_type,
    target_id,
    event_details
  );
END;
$$;

REVOKE ALL ON FUNCTION public.audit_data_modification(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_data_modification(text, text, jsonb) TO authenticated;
