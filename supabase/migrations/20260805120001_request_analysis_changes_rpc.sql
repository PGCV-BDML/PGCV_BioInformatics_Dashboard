-- ============================================================
-- 20260805120001_request_analysis_changes_rpc.sql
--
-- 1. request_analysis_changes(): lets the assigned approving
--    officer send a report back to the assignee with a comment.
--    notifications has a `WITH CHECK (false)` insert policy, so the
--    client cannot notify the assignee directly — this SECURITY
--    DEFINER function does the comment, the status change and the
--    notification in one transaction.
--
-- 2. notify_approving_officer(): also re-fires when a record moves
--    from "Changes requested" back to "For approval", so requesting
--    a re-review no longer needs the clear-the-officer-and-set-it-
--    again workaround.
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_analysis_changes(
  p_analysis_id uuid,
  p_body        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_analysis   public.analysis%ROWTYPE;
  v_body       text := btrim(coalesce(p_body, ''));
  v_actor      text;
  v_note       text;
  v_comment_id uuid;
  v_notified   boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'request_analysis_changes must be called by an authenticated user';
  END IF;

  IF v_body = '' THEN
    RAISE EXCEPTION 'A comment is required when requesting changes';
  END IF;

  SELECT * INTO v_analysis
  FROM public.analysis
  WHERE id = p_analysis_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.approver_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the assigned approving officer can request changes on this report';
  END IF;

  SELECT coalesce(nullif(btrim(name), ''), 'Approving officer')
  INTO v_actor
  FROM public.users
  WHERE id = v_caller;
  v_actor := coalesce(v_actor, 'Approving officer');

  INSERT INTO public.analysis_review_comment (analysis_id, author_id, body)
  VALUES (p_analysis_id, v_caller, v_body)
  RETURNING id INTO v_comment_id;

  -- Mirrors the "System: Approved by …" line the approve path appends.
  v_note := 'System: Changes requested by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');

  -- status_of_completion is deliberately untouched: the analysis is still
  -- Completed, it is the submission that has gone back to the analyst. Leaving
  -- the legacy `status` column alone keeps it consistent with deriveLegacyStatus().
  UPDATE public.analysis
  SET status_of_submission = 'Changes requested',
      notes = CASE
                WHEN coalesce(btrim(notes), '') = '' THEN v_note
                ELSE btrim(notes) || E'\n' || v_note
              END
  WHERE id = p_analysis_id;

  -- The officer has acted, so their own review alert is done. Any earlier
  -- unread change request is superseded by this one.
  UPDATE public.notifications
  SET is_read = true
  WHERE (payload->>'analysis_id') = p_analysis_id::text
    AND type IN ('analysis_ready_for_review', 'analysis_changes_requested')
    AND is_read = false;

  -- assignee_id is nullable, so a record may have nobody to notify. The comment
  -- is still recorded; the caller is told nobody was pinged.
  IF v_analysis.assignee_id IS NOT NULL THEN
    INSERT INTO public.notifications (type, payload, target_user_id)
    VALUES (
      'analysis_changes_requested',
      jsonb_build_object(
        'analysis_id',           p_analysis_id,
        'client_name',           v_analysis.client_name,
        'service_report_number', v_analysis.service_report_number,
        'service_report_link',   v_analysis.service_report_link,
        'comment',               v_body,
        'comment_author',        v_actor
      ),
      v_analysis.assignee_id
    );
    v_notified := true;
  END IF;

  RETURN jsonb_build_object(
    'comment_id',        v_comment_id,
    'notified_assignee', v_notified
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_analysis_changes(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_analysis_changes(uuid, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.notify_approving_officer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ready_now    boolean;
  v_ready_before boolean;
  v_resubmitted  boolean;
  v_existing     uuid;
BEGIN
  v_ready_now :=
    NEW.status = 'completed'
    AND NEW.service_report_link IS NOT NULL
    AND trim(NEW.service_report_link) <> ''
    AND NEW.approver_user_id IS NOT NULL;

  v_ready_before :=
    OLD.status = 'completed'
    AND OLD.service_report_link IS NOT NULL
    AND trim(OLD.service_report_link) <> ''
    AND OLD.approver_user_id IS NOT NULL;

  -- An analyst addressing a review comment: "Changes requested" → "For approval".
  -- The ready-edge above never sees this because the record was already ready.
  v_resubmitted :=
    lower(btrim(coalesce(OLD.status_of_submission, ''))) = 'changes requested'
    AND lower(btrim(coalesce(NEW.status_of_submission, ''))) = 'for approval'
    AND NEW.approver_user_id IS NOT NULL
    AND NEW.service_report_link IS NOT NULL
    AND trim(NEW.service_report_link) <> '';

  IF (v_ready_now AND NOT v_ready_before) OR v_resubmitted THEN
    -- Deduplicate: skip if an unread notification already exists for this analysis
    SELECT id INTO v_existing
    FROM public.notifications
    WHERE type = 'analysis_ready_for_review'
      AND (payload->>'analysis_id') = NEW.id::text
      AND is_read = false
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES (
        'analysis_ready_for_review',
        jsonb_build_object(
          'analysis_id',          NEW.id,
          'client_name',          NEW.client_name,
          'service_report_number', NEW.service_report_number,
          'service_report_link',  NEW.service_report_link
        ),
        NEW.approver_user_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
