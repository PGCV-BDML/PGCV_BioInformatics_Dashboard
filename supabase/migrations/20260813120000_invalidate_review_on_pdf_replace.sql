-- ============================================================
-- 20260813120000_invalidate_review_on_pdf_replace.sql
--
-- Signatures are burned into the service-report PDF. Replacing that
-- file after peer review voids the reviewing officer's stamp, so the
-- new PDF must go back through review before approval can run again.
--
-- Officer stamps use set_analysis_report_file() and must not trigger
-- this reset — they are drawing onto the current file, not replacing it.
-- ============================================================

-- Stamp uploads set a transaction-local flag so the BEFORE trigger
-- can tell them apart from an assignee replacing the PDF.
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
END;
$$;

REVOKE ALL ON FUNCTION public.set_analysis_report_file(uuid, text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_analysis_report_file(uuid, text, text, bigint) TO authenticated;


CREATE OR REPLACE FUNCTION public.open_service_report_stage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_report boolean := public.analysis_has_report(
    NEW.service_report_file_path, NEW.service_report_link
  );
  v_stamping boolean :=
    coalesce(current_setting('app.stamping_report', true), '') = 'true';
  v_note text;
BEGIN
  -- Replacing the stored PDF after peer review removes the burned-in
  -- signature. Send it back to the reviewing officer. Stamp uploads
  -- (set_analysis_report_file) flip app.stamping_report so they keep
  -- the existing sign-off.
  IF TG_OP = 'UPDATE'
     AND NEW.service_report_file_path IS DISTINCT FROM OLD.service_report_file_path
     AND coalesce(btrim(NEW.service_report_file_path), '') <> ''
     AND public.analysis_review_is_complete(OLD.status_of_review)
     AND NOT v_stamping
     AND lower(btrim(coalesce(OLD.status_of_submission, '')))
           NOT IN ('approved', 'submitted')
  THEN
    NEW.status_of_review := 'For review';
    v_note := 'System: PDF replaced — reviewing officer must sign again on '
              || to_char(now(), 'YYYY-MM-DD');
    IF coalesce(btrim(NEW.notes), '') = '' THEN
      NEW.notes := v_note;
    ELSE
      NEW.notes := btrim(NEW.notes) || E'\n' || v_note;
    END IF;
  END IF;

  IF NEW.status = 'completed'
     AND v_has_report
     AND NEW.reviewer_user_id IS NOT NULL
     AND btrim(coalesce(NEW.status_of_review, '')) = ''
  THEN
    NEW.status_of_review := 'For review';
  END IF;

  IF NEW.status = 'completed'
     AND v_has_report
     AND NEW.approver_user_id IS NOT NULL
     AND public.analysis_review_is_complete(NEW.status_of_review)
     AND btrim(coalesce(NEW.status_of_submission, '')) = ''
  THEN
    NEW.status_of_submission := 'For approval';
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.notify_service_report_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_insert  boolean := (TG_OP = 'INSERT');
  v_completed  boolean := (NEW.status = 'completed');
  v_has_report boolean := public.analysis_has_report(
    NEW.service_report_file_path, NEW.service_report_link
  );
  v_had_report boolean := NOT v_is_insert AND public.analysis_has_report(
    OLD.service_report_file_path, OLD.service_report_link
  );
  v_review_now       boolean;
  v_review_before    boolean;
  v_review_resent    boolean;
  v_approval_now     boolean;
  v_approval_before  boolean;
  v_approval_resent  boolean;
  v_existing         uuid;
  v_payload          jsonb;
BEGIN
  v_payload := jsonb_build_object(
    'analysis_id',              NEW.id,
    'client_name',              NEW.client_name,
    'service_report_number',    NEW.service_report_number,
    'service_report_link',      NEW.service_report_link,
    'service_report_file_path', NEW.service_report_file_path,
    'service_report_file_name', NEW.service_report_file_name
  );

  -- ---------- review stage ----------
  v_review_now :=
    v_completed
    AND v_has_report
    AND NEW.reviewer_user_id IS NOT NULL
    AND NOT public.analysis_review_is_complete(NEW.status_of_review);

  v_review_before :=
    NOT v_is_insert
    AND OLD.status = 'completed'
    AND v_had_report
    AND OLD.reviewer_user_id IS NOT NULL
    AND NOT public.analysis_review_is_complete(OLD.status_of_review);

  v_review_resent :=
    NOT v_is_insert
    AND lower(btrim(coalesce(OLD.status_of_review, ''))) = 'revision requested'
    AND lower(btrim(coalesce(NEW.status_of_review, ''))) = 'for review'
    AND NEW.reviewer_user_id IS NOT NULL
    AND v_has_report;

  IF (v_review_now AND NOT v_review_before) OR v_review_resent THEN
    SELECT id INTO v_existing
    FROM public.notifications
    WHERE type = 'analysis_ready_for_review'
      AND (payload->>'analysis_id') = NEW.id::text
      AND is_read = false
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES ('analysis_ready_for_review', v_payload, NEW.reviewer_user_id);
    END IF;
  END IF;

  -- A replaced PDF voids the prior signature. Drop unread approval
  -- alerts so the officer is not asked to sign the unsigned file.
  IF NOT v_is_insert
     AND public.analysis_review_is_complete(OLD.status_of_review)
     AND NOT public.analysis_review_is_complete(NEW.status_of_review)
  THEN
    UPDATE public.notifications
    SET is_read = true
    WHERE (payload->>'analysis_id') = NEW.id::text
      AND type = 'analysis_ready_for_approval'
      AND is_read = false;
  END IF;

  -- ---------- approval stage ----------
  v_approval_now :=
    v_completed
    AND v_has_report
    AND NEW.approver_user_id IS NOT NULL
    AND public.analysis_review_is_complete(NEW.status_of_review);

  v_approval_before :=
    NOT v_is_insert
    AND OLD.status = 'completed'
    AND v_had_report
    AND OLD.approver_user_id IS NOT NULL
    AND public.analysis_review_is_complete(OLD.status_of_review);

  v_approval_resent :=
    NOT v_is_insert
    AND lower(btrim(coalesce(OLD.status_of_submission, ''))) = 'changes requested'
    AND lower(btrim(coalesce(NEW.status_of_submission, ''))) = 'for approval'
    AND NEW.approver_user_id IS NOT NULL
    AND v_has_report
    AND public.analysis_review_is_complete(NEW.status_of_review);

  IF (v_approval_now AND NOT v_approval_before) OR v_approval_resent THEN
    v_existing := NULL;
    SELECT id INTO v_existing
    FROM public.notifications
    WHERE type = 'analysis_ready_for_approval'
      AND (payload->>'analysis_id') = NEW.id::text
      AND is_read = false
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES ('analysis_ready_for_approval', v_payload, NEW.approver_user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- After a re-review, reopen approval if the officer had sent the
-- report back (or had already opened it) before the PDF was replaced.
CREATE OR REPLACE FUNCTION public.complete_analysis_review(
  p_analysis_id uuid,
  p_body        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_analysis public.analysis%ROWTYPE;
  v_body     text := btrim(coalesce(p_body, ''));
  v_actor    text;
  v_note     text;
  v_submission text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'complete_analysis_review must be called by an authenticated user';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.reviewer_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the assigned reviewing officer can sign off this report';
  END IF;

  IF public.analysis_review_is_complete(v_analysis.status_of_review) THEN
    RETURN jsonb_build_object('already_reviewed', true, 'approver_assigned',
                              v_analysis.approver_user_id IS NOT NULL);
  END IF;

  SELECT coalesce(nullif(btrim(name), ''), 'Reviewing officer')
  INTO v_actor
  FROM public.users
  WHERE id = v_caller;
  v_actor := coalesce(v_actor, 'Reviewing officer');

  IF v_body <> '' THEN
    INSERT INTO public.analysis_review_comment
      (analysis_id, author_id, body, stage, resolved_at, resolved_by)
    VALUES (p_analysis_id, v_caller, v_body, 'review', now(), v_caller);
  END IF;

  UPDATE public.analysis_review_comment
  SET resolved_at = now(), resolved_by = v_caller
  WHERE analysis_id = p_analysis_id
    AND stage = 'review'
    AND resolved_at IS NULL;

  v_note := 'System: Reviewed by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');
  v_submission := lower(btrim(coalesce(v_analysis.status_of_submission, '')));

  UPDATE public.analysis
  SET status_of_review = 'Reviewed',
      status_of_submission = CASE
        WHEN v_submission IN ('changes requested', 'under review')
          THEN 'For approval'
        ELSE v_analysis.status_of_submission
      END,
      notes = CASE
                WHEN coalesce(btrim(notes), '') = '' THEN v_note
                ELSE btrim(notes) || E'\n' || v_note
              END
  WHERE id = p_analysis_id;

  UPDATE public.notifications
  SET is_read = true
  WHERE (payload->>'analysis_id') = p_analysis_id::text
    AND type IN ('analysis_ready_for_review', 'analysis_revision_requested')
    AND is_read = false;

  RETURN jsonb_build_object(
    'already_reviewed',  false,
    'approver_assigned', v_analysis.approver_user_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_analysis_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_analysis_review(uuid, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.mark_analysis_under_review(p_analysis_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_analysis public.analysis%ROWTYPE;
  v_status   text;
  v_actor    text;
  v_note     text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'mark_analysis_under_review must be called by an authenticated user';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.approver_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the assigned approving officer can mark this report under review';
  END IF;

  IF NOT public.analysis_review_is_complete(v_analysis.status_of_review) THEN
    RAISE EXCEPTION 'This report must be peer-reviewed before it can be approved';
  END IF;

  v_status := lower(btrim(coalesce(v_analysis.status_of_submission, '')));
  IF v_status IN ('', 'for approval') THEN
    SELECT coalesce(nullif(btrim(name), ''), 'Approving officer')
    INTO v_actor
    FROM public.users
    WHERE id = v_caller;
    v_actor := coalesce(v_actor, 'Approving officer');
    v_note := 'System: Under review by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');

    UPDATE public.analysis
    SET status_of_submission = 'Under review',
        notes = CASE
          WHEN coalesce(btrim(notes), '') = '' THEN v_note
          WHEN notes ILIKE '%System: Under review by%' THEN notes
          ELSE btrim(notes) || E'\n' || v_note
        END
    WHERE id = p_analysis_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_analysis_under_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_analysis_under_review(uuid) TO authenticated;


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

  IF NOT public.analysis_review_is_complete(v_analysis.status_of_review) THEN
    RAISE EXCEPTION 'This report must be peer-reviewed before it can be approved';
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
