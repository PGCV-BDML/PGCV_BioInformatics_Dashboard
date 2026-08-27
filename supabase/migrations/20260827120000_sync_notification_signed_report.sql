-- ============================================================
-- 20260827120000_sync_notification_signed_report.sql
--
-- Officer stamps upload a new PDF and point analysis at it, but
-- notifications keep a snapshot of the file path from when they
-- were created. After review/approval, Open Report on those cards
-- must open the signed file — not the unsigned original.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_analysis_report_file(
  p_analysis_id uuid,
  p_file_path   text,
  p_file_name   text,
  p_file_size   bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_analysis public.analysis%ROWTYPE;
  v_path     text := btrim(coalesce(p_file_path, ''));
  v_name     text := btrim(coalesce(p_file_name, ''));
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'set_analysis_report_file must be called by an authenticated user';
  END IF;

  IF v_path = '' OR v_name = '' THEN
    RAISE EXCEPTION 'A report file path and name are required';
  END IF;

  IF (storage.foldername(v_path))[1] IS DISTINCT FROM p_analysis_id::text THEN
    RAISE EXCEPTION 'Report path must belong to the analysis folder';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.reviewer_user_id IS DISTINCT FROM v_caller
     AND v_analysis.approver_user_id IS DISTINCT FROM v_caller
     AND public.get_user_role()::text <> ALL (ARRAY['team_lead', 'team_member'])
  THEN
    RAISE EXCEPTION 'Only the assigned officer or staff can update the report file';
  END IF;

  PERFORM set_config('app.stamping_report', 'true', true);

  UPDATE public.analysis
  SET service_report_file_path = v_path,
      service_report_file_name = v_name,
      service_report_file_size = p_file_size,
      service_report_uploaded_at = now(),
      service_report_uploaded_by = v_caller
  WHERE id = p_analysis_id;

  -- Review / approval / approved-complete cards should follow the
  -- current stamped file. Leave revision/change-request payloads
  -- alone: those still refer to the version that was sent back.
  UPDATE public.notifications
  SET payload = payload || jsonb_build_object(
    'service_report_file_path', v_path,
    'service_report_file_name', v_name
  )
  WHERE (payload->>'analysis_id') = p_analysis_id::text
    AND type IN (
      'analysis_ready_for_review',
      'analysis_ready_for_approval',
      'analysis_approved'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_analysis_report_file(uuid, text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_analysis_report_file(uuid, text, text, bigint) TO authenticated;

-- Existing officer/assignee cards still hold the pre-stamp path.
UPDATE public.notifications n
SET payload = n.payload || jsonb_build_object(
  'service_report_file_path', a.service_report_file_path,
  'service_report_file_name', a.service_report_file_name
)
FROM public.analysis a
WHERE (n.payload->>'analysis_id') = a.id::text
  AND n.type IN (
    'analysis_ready_for_review',
    'analysis_ready_for_approval',
    'analysis_approved'
  )
  AND coalesce(btrim(a.service_report_file_path), '') <> ''
  AND (
    n.payload->>'service_report_file_path' IS DISTINCT FROM a.service_report_file_path
    OR n.payload->>'service_report_file_name' IS DISTINCT FROM a.service_report_file_name
  );
