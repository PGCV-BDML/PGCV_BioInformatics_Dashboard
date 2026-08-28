-- Workflow history for sequence analyses: status and PDF events live on
-- their own table (same idea as incident_status_event) instead of being
-- appended as "System: …" lines in analysis.notes.

CREATE TABLE IF NOT EXISTS public.analysis_status_event (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  field text NOT NULL,
  from_value text NULL,
  to_value text NULL,
  changed_by uuid NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  note text NULL,
  CONSTRAINT analysis_status_event_pkey PRIMARY KEY (id),
  CONSTRAINT analysis_status_event_analysis_id_fkey
    FOREIGN KEY (analysis_id) REFERENCES public.analysis (id)
    ON DELETE CASCADE,
  CONSTRAINT analysis_status_event_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.users (id)
    ON DELETE SET NULL,
  CONSTRAINT analysis_status_event_field_chk
    CHECK (field = ANY (ARRAY['completion', 'review', 'submission', 'file']))
);

CREATE INDEX IF NOT EXISTS idx_analysis_status_event_analysis_id
  ON public.analysis_status_event USING btree (analysis_id, changed_at DESC);

ALTER TABLE public.analysis_status_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analysis_status_event select staff"
  ON public.analysis_status_event;
CREATE POLICY "analysis_status_event select staff"
  ON public.analysis_status_event FOR SELECT TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    OR public.is_reviewing_officer()
  );

DROP POLICY IF EXISTS "analysis_status_event no direct insert"
  ON public.analysis_status_event;
CREATE POLICY "analysis_status_event no direct insert"
  ON public.analysis_status_event FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "analysis_status_event no direct update"
  ON public.analysis_status_event;
CREATE POLICY "analysis_status_event no direct update"
  ON public.analysis_status_event FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "analysis_status_event no direct delete"
  ON public.analysis_status_event;
CREATE POLICY "analysis_status_event no direct delete"
  ON public.analysis_status_event FOR DELETE TO authenticated
  USING (false);

GRANT SELECT ON TABLE public.analysis_status_event TO authenticated;

-- Existing System: lines → structured events, then strip them from notes.
INSERT INTO public.analysis_status_event (
  analysis_id, field, from_value, to_value, changed_by, changed_at, note
)
SELECT
  a.id,
  CASE
    WHEN btrim(line) ILIKE 'System: Revision requested by %' THEN 'review'
    WHEN btrim(line) ILIKE 'System: Changes requested by %' THEN 'submission'
    WHEN btrim(line) ILIKE 'System: Reviewed by %' THEN 'review'
    WHEN btrim(line) ILIKE 'System: Under review by %' THEN 'submission'
    WHEN btrim(line) ILIKE 'System: Approved by %' THEN 'submission'
    WHEN btrim(line) ILIKE 'System: PDF replaced%' THEN 'file'
    WHEN btrim(line) ILIKE 'System: Resubmitted for review by %' THEN 'review'
    WHEN btrim(line) ILIKE 'System: Resubmitted for approval by %' THEN 'submission'
    ELSE NULL
  END,
  CASE
    WHEN btrim(line) ILIKE 'System: Resubmitted for review by %'
      THEN 'Revision requested'
    WHEN btrim(line) ILIKE 'System: Resubmitted for approval by %'
      THEN 'Changes requested'
    ELSE NULL
  END,
  CASE
    WHEN btrim(line) ILIKE 'System: Revision requested by %'
      THEN 'Revision requested'
    WHEN btrim(line) ILIKE 'System: Changes requested by %'
      THEN 'Changes requested'
    WHEN btrim(line) ILIKE 'System: Reviewed by %' THEN 'Reviewed'
    WHEN btrim(line) ILIKE 'System: Under review by %' THEN 'Under review'
    WHEN btrim(line) ILIKE 'System: Approved by %' THEN 'Approved'
    WHEN btrim(line) ILIKE 'System: PDF replaced%' THEN NULL
    WHEN btrim(line) ILIKE 'System: Resubmitted for review by %'
      THEN 'For review'
    WHEN btrim(line) ILIKE 'System: Resubmitted for approval by %'
      THEN 'For approval'
    ELSE NULL
  END,
  NULL,
  (
    coalesce(
      substring(btrim(line) from 'on ([0-9]{4}-[0-9]{2}-[0-9]{2})$')::date,
      CURRENT_DATE
    )::timestamp
    + make_interval(secs => t.ord)
  ) AT TIME ZONE 'Asia/Manila',
  CASE
    WHEN btrim(line) ILIKE 'System: PDF replaced%' THEN NULL
    ELSE nullif(
      btrim(
        substring(
          btrim(line)
          from ' by (.+) on [0-9]{4}-[0-9]{2}-[0-9]{2}$'
        )
      ),
      ''
    )
  END
FROM public.analysis a
CROSS JOIN LATERAL unnest(string_to_array(coalesce(a.notes, ''), E'\n'))
  WITH ORDINALITY AS t(line, ord)
WHERE a.notes ILIKE '%System:%'
  AND btrim(t.line) ILIKE 'System:%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.analysis_status_event e
    WHERE e.analysis_id = a.id
  )
  AND CASE
    WHEN btrim(t.line) ILIKE 'System: Revision requested by %' THEN true
    WHEN btrim(t.line) ILIKE 'System: Changes requested by %' THEN true
    WHEN btrim(t.line) ILIKE 'System: Reviewed by %' THEN true
    WHEN btrim(t.line) ILIKE 'System: Under review by %' THEN true
    WHEN btrim(t.line) ILIKE 'System: Approved by %' THEN true
    WHEN btrim(t.line) ILIKE 'System: PDF replaced%' THEN true
    WHEN btrim(t.line) ILIKE 'System: Resubmitted for review by %' THEN true
    WHEN btrim(t.line) ILIKE 'System: Resubmitted for approval by %' THEN true
    ELSE false
  END;

UPDATE public.analysis
SET notes = nullif(
  btrim(
    regexp_replace(
      regexp_replace(
        notes,
        '(^|\n)[ \t]*System:[^\n]*',
        '\1',
        'g'
      ),
      '\n{2,}',
      E'\n',
      'g'
    )
  ),
  ''
)
WHERE notes ILIKE '%System:%';


CREATE OR REPLACE FUNCTION public.analysis_record_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stamping boolean :=
    coalesce(current_setting('app.stamping_report', true), '') = 'true';
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
        analysis_id, field, from_value, to_value, changed_by
      ) VALUES (
        NEW.id,
        'file',
        NULL,
        coalesce(
          nullif(btrim(coalesce(NEW.service_report_file_name, '')), ''),
          v_new
        ),
        auth.uid()
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
        analysis_id, field, from_value, to_value, changed_by
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
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_record_status_event ON public.analysis;
CREATE TRIGGER analysis_record_status_event
  AFTER INSERT OR UPDATE ON public.analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.analysis_record_status_event();


-- Stop appending System: lines. The trigger above is now the audit trail.

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

  INSERT INTO public.analysis_review_comment (
    analysis_id, author_id, body, stage, file_path, file_name
  ) VALUES (
    p_analysis_id,
    v_caller,
    v_body,
    'review',
    nullif(btrim(coalesce(v_analysis.service_report_file_path, '')), ''),
    nullif(btrim(coalesce(v_analysis.service_report_file_name, '')), '')
  )
  RETURNING id INTO v_comment_id;

  UPDATE public.analysis
  SET status_of_review = 'Revision requested'
  WHERE id = p_analysis_id;

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

  INSERT INTO public.analysis_review_comment (
    analysis_id, author_id, body, stage, file_path, file_name
  ) VALUES (
    p_analysis_id,
    v_caller,
    v_body,
    'approval',
    nullif(btrim(coalesce(v_analysis.service_report_file_path, '')), ''),
    nullif(btrim(coalesce(v_analysis.service_report_file_name, '')), '')
  )
  RETURNING id INTO v_comment_id;

  UPDATE public.analysis
  SET status_of_submission = 'Changes requested'
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
        WHEN v_submission IN ('changes requested', 'under review')
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
    UPDATE public.analysis
    SET status_of_submission = 'Under review'
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
