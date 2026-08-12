-- ============================================================
-- 20260812150000_analysis_approved_notification.sql
--
-- Notify the assignee when the approving officer signs off.
-- Mirrors revision/changes notifications: insert from the
-- SECURITY DEFINER approve_analysis RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_analysis(p_analysis_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_analysis public.analysis%ROWTYPE;
  v_actor    text;
  v_note     text;
  v_status   text;
  v_existing uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'approve_analysis must be called by an authenticated user';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.approver_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the assigned approving officer can approve this report';
  END IF;

  v_status := lower(btrim(coalesce(v_analysis.status_of_submission, '')));
  IF v_status IN ('approved', 'submitted') THEN
    RETURN jsonb_build_object('already_approved', true);
  END IF;

  SELECT coalesce(nullif(btrim(name), ''), 'Approving officer')
  INTO v_actor
  FROM public.users
  WHERE id = v_caller;
  v_actor := coalesce(v_actor, 'Approving officer');

  UPDATE public.analysis_review_comment
  SET resolved_at = now(), resolved_by = v_caller
  WHERE analysis_id = p_analysis_id
    AND stage = 'approval'
    AND resolved_at IS NULL;

  v_note := 'System: Approved by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');

  UPDATE public.analysis
  SET status_of_submission = 'Approved',
      status = CASE
                 WHEN lower(btrim(coalesce(v_analysis.status_of_completion, ''))) = 'completed'
                   THEN 'completed'::public.analysis_status
                 WHEN lower(btrim(coalesce(v_analysis.status_of_completion, '')))
                        IN ('on-going', 'ongoing', 'on going')
                   THEN 'ongoing'::public.analysis_status
                 WHEN lower(btrim(coalesce(v_analysis.status_of_completion, ''))) LIKE '%on hold%'
                   THEN 'on_hold'::public.analysis_status
                 ELSE 'submitted'::public.analysis_status
               END,
      notes = CASE
                WHEN coalesce(btrim(notes), '') = '' THEN v_note
                WHEN notes ILIKE '%System: Approved by%' THEN notes
                ELSE btrim(notes) || E'\n' || v_note
              END
  WHERE id = p_analysis_id;

  UPDATE public.notifications
  SET is_read = true
  WHERE (payload->>'analysis_id') = p_analysis_id::text
    AND type IN ('analysis_ready_for_approval', 'analysis_changes_requested')
    AND is_read = false;

  IF v_analysis.assignee_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.notifications
    WHERE type = 'analysis_approved'
      AND (payload->>'analysis_id') = p_analysis_id::text
      AND is_read = false
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES (
        'analysis_approved',
        jsonb_build_object(
          'analysis_id',              p_analysis_id,
          'client_name',              v_analysis.client_name,
          'service_report_number',    v_analysis.service_report_number,
          'service_report_link',      v_analysis.service_report_link,
          'service_report_file_path', v_analysis.service_report_file_path,
          'service_report_file_name', v_analysis.service_report_file_name,
          'approved_by',              v_actor
        ),
        v_analysis.assignee_id
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'already_approved', false,
    'notified_assignee', v_analysis.assignee_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_analysis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_analysis(uuid) TO authenticated;
