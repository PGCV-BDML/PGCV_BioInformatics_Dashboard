-- ============================================================
-- 20260806120002_review_workflow_rpcs.sql
--
-- The peer review stage, server side.
--
-- Four notification types now exist, two per stage:
--   analysis_ready_for_review     → reviewing officer
--   analysis_revision_requested   → assignee   (from the reviewer)
--   analysis_ready_for_approval   → approving officer
--   analysis_changes_requested    → assignee   (from the officer)
--
-- `analysis_ready_for_review` keeps its name but changes meaning:
-- it used to be the approving officer's alert. Existing rows are
-- re-typed at the bottom of this file so nobody's pending queue
-- renders under the wrong role.
--
-- Everything that has to happen atomically — comment + status +
-- notification — goes through a SECURITY DEFINER function, because
-- `notifications` has a WITH CHECK (false) insert policy and the
-- client can never write to it directly.
-- ============================================================

-- ------------------------------------------------------------
-- Shared predicates
-- ------------------------------------------------------------

-- Going forward the PDF is the source of truth. A pasted link alone
-- still counts so legacy rows (and optional Drive/share URLs alongside
-- a PDF) can progress without being re-uploaded.
CREATE OR REPLACE FUNCTION public.analysis_has_report(
  p_file_path text,
  p_link      text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(btrim(coalesce(p_file_path, '')), '') <> ''
      OR coalesce(btrim(coalesce(p_link, '')), '') <> '';
$$;

CREATE OR REPLACE FUNCTION public.analysis_review_is_complete(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(coalesce(p_status, ''))) = 'reviewed';
$$;


-- ------------------------------------------------------------
-- BEFORE trigger: open each stage as its preconditions are met
-- ------------------------------------------------------------
-- Without this the tracker would show a blank Status of Review on
-- records that are demonstrably waiting on a reviewer, and a blank
-- Status of Submission on ones sitting in the officer's queue.
CREATE OR REPLACE FUNCTION public.open_service_report_stage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_report boolean := public.analysis_has_report(
    NEW.service_report_file_path, NEW.service_report_link
  );
BEGIN
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

DROP TRIGGER IF EXISTS analysis_open_stage ON public.analysis;
CREATE TRIGGER analysis_open_stage
  BEFORE INSERT OR UPDATE ON public.analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.open_service_report_stage();


-- ------------------------------------------------------------
-- AFTER trigger: notify whoever the record is now waiting on
-- ------------------------------------------------------------
-- Replaces notify_approving_officer(). Two changes beyond the new
-- stage: the approving officer is gated on the review being signed
-- off, and this fires on INSERT as well as UPDATE. The old function
-- was UPDATE-only, which is why the workflow guide used to tell
-- people to clear the officer and re-save to force an alert.
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

  -- The analyst answering a revision request. The ready-edge above
  -- never catches this because the record was already ready.
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
    AND v_has_report;

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

DROP TRIGGER IF EXISTS analysis_notify_on_completion ON public.analysis;
DROP TRIGGER IF EXISTS analysis_notify_stage ON public.analysis;
CREATE TRIGGER analysis_notify_stage
  AFTER INSERT OR UPDATE ON public.analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_service_report_stage();

DROP FUNCTION IF EXISTS public.notify_approving_officer();


-- ------------------------------------------------------------
-- Reviewer: open the report
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_analysis_in_review(p_analysis_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_analysis public.analysis%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'mark_analysis_in_review must be called by an authenticated user';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.reviewer_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the assigned reviewing officer can review this report';
  END IF;

  -- Never walk the stage backwards: a signed-off or sent-back report
  -- stays where it is when the reviewer re-opens the PDF.
  IF lower(btrim(coalesce(v_analysis.status_of_review, ''))) IN ('', 'for review') THEN
    UPDATE public.analysis
    SET status_of_review = 'In review'
    WHERE id = p_analysis_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_analysis_in_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_analysis_in_review(uuid) TO authenticated;


-- ------------------------------------------------------------
-- Reviewer: send the report back to the analyst
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_analysis_revision(
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
    RAISE EXCEPTION 'request_analysis_revision must be called by an authenticated user';
  END IF;

  IF v_body = '' THEN
    RAISE EXCEPTION 'A comment is required when requesting a revision';
  END IF;

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analysis % not found', p_analysis_id;
  END IF;

  IF v_analysis.reviewer_user_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Only the assigned reviewing officer can request a revision on this report';
  END IF;

  SELECT coalesce(nullif(btrim(name), ''), 'Reviewing officer')
  INTO v_actor
  FROM public.users
  WHERE id = v_caller;
  v_actor := coalesce(v_actor, 'Reviewing officer');

  INSERT INTO public.analysis_review_comment (analysis_id, author_id, body, stage)
  VALUES (p_analysis_id, v_caller, v_body, 'review')
  RETURNING id INTO v_comment_id;

  v_note := 'System: Revision requested by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');

  -- status_of_completion is untouched: the analysis is still Completed,
  -- it is the report that has gone back to the analyst.
  UPDATE public.analysis
  SET status_of_review = 'Revision requested',
      notes = CASE
                WHEN coalesce(btrim(notes), '') = '' THEN v_note
                ELSE btrim(notes) || E'\n' || v_note
              END
  WHERE id = p_analysis_id;

  -- The reviewer has acted, so their own alert is done. Any earlier
  -- unresolved revision request is superseded by this one.
  UPDATE public.notifications
  SET is_read = true
  WHERE (payload->>'analysis_id') = p_analysis_id::text
    AND type IN ('analysis_ready_for_review', 'analysis_revision_requested')
    AND is_read = false;

  IF v_analysis.assignee_id IS NOT NULL THEN
    INSERT INTO public.notifications (type, payload, target_user_id)
    VALUES (
      'analysis_revision_requested',
      jsonb_build_object(
        'analysis_id',              p_analysis_id,
        'client_name',              v_analysis.client_name,
        'service_report_number',    v_analysis.service_report_number,
        'service_report_link',      v_analysis.service_report_link,
        'service_report_file_path', v_analysis.service_report_file_path,
        'service_report_file_name', v_analysis.service_report_file_name,
        'comment',                  v_body,
        'comment_author',           v_actor
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

REVOKE ALL ON FUNCTION public.request_analysis_revision(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_analysis_revision(uuid, text) TO authenticated;


-- ------------------------------------------------------------
-- Reviewer: sign the report off
-- ------------------------------------------------------------
-- Setting status_of_review to Reviewed is what opens the approval
-- stage; the AFTER trigger notifies the officer off this update.
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

  -- An optional sign-off note lands resolved: it is a record of what
  -- was checked, not something the analyst has to action.
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

  UPDATE public.analysis
  SET status_of_review = 'Reviewed',
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


-- ------------------------------------------------------------
-- Officer: send back for changes (stage-tagged, retyped alerts)
-- ------------------------------------------------------------
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

  SELECT * INTO v_analysis FROM public.analysis WHERE id = p_analysis_id FOR UPDATE;
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

  INSERT INTO public.analysis_review_comment (analysis_id, author_id, body, stage)
  VALUES (p_analysis_id, v_caller, v_body, 'approval')
  RETURNING id INTO v_comment_id;

  v_note := 'System: Changes requested by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');

  UPDATE public.analysis
  SET status_of_submission = 'Changes requested',
      notes = CASE
                WHEN coalesce(btrim(notes), '') = '' THEN v_note
                ELSE btrim(notes) || E'\n' || v_note
              END
  WHERE id = p_analysis_id;

  UPDATE public.notifications
  SET is_read = true
  WHERE (payload->>'analysis_id') = p_analysis_id::text
    AND type IN ('analysis_ready_for_approval', 'analysis_changes_requested')
    AND is_read = false;

  IF v_analysis.assignee_id IS NOT NULL THEN
    INSERT INTO public.notifications (type, payload, target_user_id)
    VALUES (
      'analysis_changes_requested',
      jsonb_build_object(
        'analysis_id',              p_analysis_id,
        'client_name',              v_analysis.client_name,
        'service_report_number',    v_analysis.service_report_number,
        'service_report_link',      v_analysis.service_report_link,
        'service_report_file_path', v_analysis.service_report_file_path,
        'service_report_file_name', v_analysis.service_report_file_name,
        'comment',                  v_body,
        'comment_author',           v_actor
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


-- ------------------------------------------------------------
-- Retype in-flight alerts
-- ------------------------------------------------------------
-- Every existing analysis_ready_for_review row was addressed to an
-- approving officer under the old two-stage flow. Left alone they
-- would render in the reviewer's UI, offering a sign-off action the
-- recipient has no authority to take.
UPDATE public.notifications
SET type = 'analysis_ready_for_approval'
WHERE type = 'analysis_ready_for_review';
