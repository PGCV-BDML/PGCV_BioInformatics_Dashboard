-- ============================================================
-- 20260908160000_revise_signed_service_report.sql
--
-- After a report is Approved or Submitted, the assignee may still
-- need to replace the PDF. Signatures are burned into the previous
-- file, so the new version must go back through review and approval.
--
-- Accidental file-path saves must not void a signed report. Mid-
-- workflow replaces (For approval / Under review) still go through
-- open_service_report_stage. Post-sign-off replaces go through
-- revise_signed_service_report(), which requires a reason.
-- ============================================================

-- A replaced PDF after peer review, before sign-off, still voids the
-- reviewer stamp. Also clear For approval / Under review so approval
-- only reopens after the new file is reviewed. Approved / Submitted
-- stay protected here — use revise_signed_service_report instead.
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
  v_old_submission text;
BEGIN
  v_old_submission := lower(btrim(coalesce(OLD.status_of_submission, '')));

  IF TG_OP = 'UPDATE'
     AND NEW.service_report_file_path IS DISTINCT FROM OLD.service_report_file_path
     AND coalesce(btrim(NEW.service_report_file_path), '') <> ''
     AND public.analysis_review_is_complete(OLD.status_of_review)
     AND NOT v_stamping
     AND v_old_submission NOT IN ('approved', 'submitted')
  THEN
    NEW.status_of_review := 'For review';
    IF v_old_submission IN ('for approval', 'under review') THEN
      NEW.status_of_submission := NULL;
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


-- Stamp the assignee's reason onto the file activity row when present.
CREATE OR REPLACE FUNCTION public.analysis_record_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stamping boolean :=
    coalesce(current_setting('app.stamping_report', true), '') = 'true';
  v_reason text :=
    nullif(btrim(coalesce(current_setting('app.revision_reason', true), '')), '');
  v_old text;
  v_new text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := nullif(btrim(coalesce(NEW.status_of_completion, '')), '');
    IF v_new IS NOT NULL THEN
      INSERT INTO public.analysis_status_event (
        analysis_id, field, from_value, to_value, changed_by
      ) VALUES (NEW.id, 'completion', NULL, v_new, auth.uid());
    END IF;

    v_new := nullif(btrim(coalesce(NEW.status_of_review, '')), '');
    IF v_new IS NOT NULL THEN
      INSERT INTO public.analysis_status_event (
        analysis_id, field, from_value, to_value, changed_by
      ) VALUES (NEW.id, 'review', NULL, v_new, auth.uid());
    END IF;

    v_new := nullif(btrim(coalesce(NEW.status_of_submission, '')), '');
    IF v_new IS NOT NULL THEN
      INSERT INTO public.analysis_status_event (
        analysis_id, field, from_value, to_value, changed_by
      ) VALUES (NEW.id, 'submission', NULL, v_new, auth.uid());
    END IF;

    v_new := nullif(btrim(coalesce(NEW.service_report_file_path, '')), '');
    IF v_new IS NOT NULL THEN
      INSERT INTO public.analysis_status_event (
        analysis_id, field, from_value, to_value, changed_by, note
      ) VALUES (
        NEW.id,
        'file',
        NULL,
        coalesce(
          nullif(btrim(coalesce(NEW.service_report_file_name, '')), ''),
          v_new
        ),
        auth.uid(),
        v_reason
      );
    END IF;

    RETURN NEW;
  END IF;

  v_old := nullif(btrim(coalesce(OLD.status_of_completion, '')), '');
  v_new := nullif(btrim(coalesce(NEW.status_of_completion, '')), '');
  IF v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.analysis_status_event (
      analysis_id, field, from_value, to_value, changed_by
    ) VALUES (NEW.id, 'completion', v_old, v_new, auth.uid());
  END IF;

  v_old := nullif(btrim(coalesce(OLD.status_of_review, '')), '');
  v_new := nullif(btrim(coalesce(NEW.status_of_review, '')), '');
  IF v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.analysis_status_event (
      analysis_id, field, from_value, to_value, changed_by
    ) VALUES (NEW.id, 'review', v_old, v_new, auth.uid());
  END IF;

  v_old := nullif(btrim(coalesce(OLD.status_of_submission, '')), '');
  v_new := nullif(btrim(coalesce(NEW.status_of_submission, '')), '');
  IF v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.analysis_status_event (
      analysis_id, field, from_value, to_value, changed_by
    ) VALUES (NEW.id, 'submission', v_old, v_new, auth.uid());
  END IF;

  IF NOT v_stamping THEN
    v_old := nullif(btrim(coalesce(OLD.service_report_file_path, '')), '');
    v_new := nullif(btrim(coalesce(NEW.service_report_file_path, '')), '');
    IF v_old IS DISTINCT FROM v_new THEN
      INSERT INTO public.analysis_status_event (
        analysis_id, field, from_value, to_value, changed_by, note
      ) VALUES (
        NEW.id,
        'file',
        CASE
          WHEN v_old IS NULL THEN NULL
          ELSE coalesce(
            nullif(btrim(coalesce(OLD.service_report_file_name, '')), ''),
            v_old
          )
        END,
        CASE
          WHEN v_new IS NULL THEN NULL
          ELSE coalesce(
            nullif(btrim(coalesce(NEW.service_report_file_name, '')), ''),
            v_new
          )
        END,
        auth.uid(),
        v_reason
      );
    END IF;
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

  -- A replaced PDF voids prior signatures. Drop unread approval and
  -- "report approved" alerts so nobody is asked to sign the old file.
  IF NOT v_is_insert
     AND public.analysis_review_is_complete(OLD.status_of_review)
     AND NOT public.analysis_review_is_complete(NEW.status_of_review)
  THEN
    UPDATE public.notifications
    SET is_read = true
    WHERE (payload->>'analysis_id') = NEW.id::text
      AND type IN ('analysis_ready_for_approval', 'analysis_approved')
      AND is_read = false;
  END IF;

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

  IF v_body <> '' THEN
    INSERT INTO public.analysis_review_comment
      (analysis_id, author_id, body, stage, resolved_at, resolved_by, file_path, file_name)
    VALUES (
      p_analysis_id,
      v_caller,
      v_body,
      'review',
      now(),
      v_caller,
      nullif(btrim(coalesce(v_analysis.service_report_file_path, '')), ''),
      nullif(btrim(coalesce(v_analysis.service_report_file_name, '')), '')
    );
  END IF;

  UPDATE public.analysis_review_comment
  SET resolved_at = now(), resolved_by = v_caller
  WHERE analysis_id = p_analysis_id
    AND stage = 'review'
    AND resolved_at IS NULL;

  v_submission := lower(btrim(coalesce(v_analysis.status_of_submission, '')));

  UPDATE public.analysis
  SET status_of_review = 'Reviewed',
      status_of_submission = CASE
        WHEN v_submission IN (
          'changes requested', 'under review', 'approved', 'submitted'
        )
          THEN 'For approval'
        ELSE v_analysis.status_of_submission
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


-- Explicit post-sign-off revision. Does not set app.stamping_report, so
-- the new file is recorded as kind = revision.
CREATE OR REPLACE FUNCTION public.revise_signed_service_report(
  p_analysis_id uuid,
  p_file_path   text,
  p_file_name   text,
  p_file_size   bigint,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_analysis   public.analysis%ROWTYPE;
  v_path       text := btrim(coalesce(p_file_path, ''));
  v_name       text := btrim(coalesce(p_file_name, ''));
  v_reason     text := btrim(coalesce(p_reason, ''));
  v_submission text;
  v_role       text;
  v_cleared    boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'revise_signed_service_report must be called by an authenticated user';
  END IF;

  IF v_path = '' OR v_name = '' THEN
    RAISE EXCEPTION 'A report file path and name are required';
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'A reason is required when replacing a signed service report';
  END IF;

  IF (storage.foldername(v_path))[1] IS DISTINCT FROM p_analysis_id::text THEN
    RAISE EXCEPTION 'Report path must belong to the analysis folder';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  v_role := public.get_user_role()::text;
  IF v_analysis.assignee_id IS DISTINCT FROM v_caller
     AND v_role IS DISTINCT FROM 'team_lead'
     AND v_role IS DISTINCT FROM 'team_member'
  THEN
    RAISE EXCEPTION 'Only the assignee or staff can revise a signed service report';
  END IF;

  v_submission := lower(btrim(coalesce(v_analysis.status_of_submission, '')));
  IF v_submission NOT IN ('approved', 'submitted') THEN
    RAISE EXCEPTION 'This report has not been approved yet';
  END IF;

  IF v_path IS NOT DISTINCT FROM v_analysis.service_report_file_path THEN
    RAISE EXCEPTION 'Upload a new PDF version before asking officers to sign again';
  END IF;

  PERFORM set_config('app.revision_reason', v_reason, true);

  UPDATE public.analysis
  SET service_report_file_path = v_path,
      service_report_file_name = v_name,
      service_report_file_size = p_file_size,
      service_report_uploaded_at = now(),
      service_report_uploaded_by = v_caller,
      status_of_review = 'For review',
      status_of_submission = NULL
  WHERE id = p_analysis_id;

  UPDATE public.service_report
  SET client_acknowledged_at = NULL
  WHERE analysis_id = p_analysis_id
    AND client_acknowledged_at IS NOT NULL;

  IF FOUND THEN
    v_cleared := true;
  END IF;

  RETURN jsonb_build_object(
    'status_of_review',             'For review',
    'status_of_submission',         NULL,
    'service_report_file_path',     v_path,
    'service_report_file_name',     v_name,
    'client_acknowledged_cleared',  v_cleared
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revise_signed_service_report(uuid, text, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revise_signed_service_report(uuid, text, text, bigint, text) TO authenticated;

COMMENT ON FUNCTION public.revise_signed_service_report(uuid, text, text, bigint, text) IS
  'Replace the current signed service-report PDF, void both stamps, and reopen peer review. Requires a reason.';
