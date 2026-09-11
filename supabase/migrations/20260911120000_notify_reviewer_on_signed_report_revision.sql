-- ============================================================
-- 20260911120000_notify_reviewer_on_signed_report_revision.sql
--
-- Replacing a signed service report must always put the new PDF
-- back in front of the reviewing officer. Two gaps blocked that:
--
-- 1. notify_service_report_stage() only created
--    analysis_ready_for_review when analysis.status = 'completed'.
--    Approved / Submitted records can sit at status = 'submitted',
--    and Reviewed → For review was not treated as a resend.
-- 2. Tracker / edit-panel PDF replaces skipped
--    revise_signed_service_report(), so review stayed Reviewed and
--    no notification was inserted.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_service_report_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_insert  boolean := (TG_OP = 'INSERT');
  -- Approved/Submitted often store legacy status as 'submitted'.
  -- Treat those the same as 'completed' for officer alerts.
  v_eligible   boolean := (NEW.status IN ('completed', 'submitted'));
  v_was_eligible boolean :=
    NOT v_is_insert AND OLD.status IN ('completed', 'submitted');
  v_has_report boolean := public.analysis_has_report(
    NEW.service_report_file_path, NEW.service_report_link
  );
  v_had_report boolean := NOT v_is_insert AND public.analysis_has_report(
    OLD.service_report_file_path, OLD.service_report_link
  );
  v_review_now       boolean;
  v_review_before    boolean;
  v_review_resent    boolean;
  v_review_reopened  boolean;
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
    v_eligible
    AND v_has_report
    AND NEW.reviewer_user_id IS NOT NULL
    AND NOT public.analysis_review_is_complete(NEW.status_of_review);

  v_review_before :=
    v_was_eligible
    AND v_had_report
    AND OLD.reviewer_user_id IS NOT NULL
    AND NOT public.analysis_review_is_complete(OLD.status_of_review);

  v_review_resent :=
    NOT v_is_insert
    AND lower(btrim(coalesce(OLD.status_of_review, ''))) = 'revision requested'
    AND lower(btrim(coalesce(NEW.status_of_review, ''))) = 'for review'
    AND NEW.reviewer_user_id IS NOT NULL
    AND v_has_report;

  -- PDF replace or revise_signed_service_report() after sign-off.
  v_review_reopened :=
    NOT v_is_insert
    AND public.analysis_review_is_complete(OLD.status_of_review)
    AND NOT public.analysis_review_is_complete(NEW.status_of_review)
    AND NEW.reviewer_user_id IS NOT NULL
    AND v_has_report;

  IF (v_review_now AND NOT v_review_before)
     OR v_review_resent
     OR v_review_reopened
  THEN
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
    v_eligible
    AND v_has_report
    AND NEW.approver_user_id IS NOT NULL
    AND public.analysis_review_is_complete(NEW.status_of_review);

  v_approval_before :=
    v_was_eligible
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
      status_of_submission = NULL,
      status = CASE
        WHEN lower(btrim(coalesce(status_of_completion, ''))) = 'completed'
          THEN 'completed'::public.analysis_status
        ELSE status
      END
  WHERE id = p_analysis_id;

  UPDATE public.service_report
  SET client_acknowledged_at = NULL
  WHERE analysis_id = p_analysis_id
    AND client_acknowledged_at IS NOT NULL;

  IF FOUND THEN
    v_cleared := true;
  END IF;

  -- Belt-and-suspenders: the AFTER trigger also inserts this. Skip if
  -- an unread review request is already waiting.
  IF v_analysis.reviewer_user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.notifications
       WHERE type = 'analysis_ready_for_review'
         AND (payload->>'analysis_id') = p_analysis_id::text
         AND is_read = false
     )
  THEN
    INSERT INTO public.notifications (type, payload, target_user_id)
    VALUES (
      'analysis_ready_for_review',
      jsonb_build_object(
        'analysis_id',              p_analysis_id,
        'client_name',              v_analysis.client_name,
        'service_report_number',    v_analysis.service_report_number,
        'service_report_link',      v_analysis.service_report_link,
        'service_report_file_path', v_path,
        'service_report_file_name', v_name
      ),
      v_analysis.reviewer_user_id
    );
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
  'Replace the current signed service-report PDF, void both stamps, reopen peer review, and notify the reviewing officer. Requires a reason.';


-- Repair: a new unsigned PDF was stored after sign-off, but review was
-- left at Reviewed + Approved/Submitted (tracker bypass).
WITH latest_version AS (
  SELECT DISTINCT ON (analysis_id)
    analysis_id,
    kind
  FROM public.analysis_service_report_version
  ORDER BY analysis_id, uploaded_at DESC, id DESC
),
broken AS (
  SELECT a.id
  FROM public.analysis a
  JOIN latest_version v ON v.analysis_id = a.id
  WHERE v.kind = 'revision'
    AND public.analysis_review_is_complete(a.status_of_review)
    AND lower(btrim(coalesce(a.status_of_submission, ''))) IN ('approved', 'submitted')
)
UPDATE public.analysis a
SET status_of_review = 'For review',
    status_of_submission = NULL,
    status = CASE
      WHEN lower(btrim(coalesce(a.status_of_completion, ''))) = 'completed'
        THEN 'completed'::public.analysis_status
      ELSE a.status
    END
FROM broken b
WHERE a.id = b.id;

UPDATE public.service_report sr
SET client_acknowledged_at = NULL
WHERE sr.client_acknowledged_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.analysis a
    WHERE a.id = sr.analysis_id
      AND lower(btrim(coalesce(a.status_of_review, ''))) = 'for review'
      AND a.status_of_submission IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.analysis_service_report_version v
        WHERE v.analysis_id = a.id
          AND v.kind = 'revision'
      )
      AND EXISTS (
        SELECT 1
        FROM public.analysis_status_event e
        WHERE e.analysis_id = a.id
          AND e.field = 'submission'
          AND lower(btrim(coalesce(e.to_value, ''))) IN ('approved', 'submitted')
      )
  );

-- Backfill a review notification when a previously signed report is
-- already For review after a revision, but no alert was created then.
INSERT INTO public.notifications (type, payload, target_user_id)
SELECT
  'analysis_ready_for_review',
  jsonb_build_object(
    'analysis_id',              a.id,
    'client_name',              a.client_name,
    'service_report_number',    a.service_report_number,
    'service_report_link',      a.service_report_link,
    'service_report_file_path', a.service_report_file_path,
    'service_report_file_name', a.service_report_file_name
  ),
  a.reviewer_user_id
FROM public.analysis a
JOIN LATERAL (
  SELECT v.uploaded_at
  FROM public.analysis_service_report_version v
  WHERE v.analysis_id = a.id
    AND v.kind = 'revision'
  ORDER BY v.uploaded_at DESC
  LIMIT 1
) rev ON true
WHERE a.reviewer_user_id IS NOT NULL
  AND public.analysis_has_report(
    a.service_report_file_path, a.service_report_link
  )
  AND NOT public.analysis_review_is_complete(a.status_of_review)
  AND EXISTS (
    SELECT 1
    FROM public.analysis_status_event e
    WHERE e.analysis_id = a.id
      AND e.field = 'submission'
      AND lower(btrim(coalesce(e.to_value, ''))) IN ('approved', 'submitted')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.type = 'analysis_ready_for_review'
      AND (n.payload->>'analysis_id') = a.id::text
      AND n.created_at >= rev.uploaded_at
  );
