-- ============================================================
-- 20260827180000_service_report_versions.sql
--
-- Service-report PDFs are versioned. The analysis row still
-- points at the current file (open / sign / send). Previous
-- uploads stay in storage and on this table so a comment like
-- "table 2 is wrong" can still open the PDF the officer saw.
--
-- Comments snapshot that path at insert time. Stamp uploads
-- already use unique keys; assignee revisions used to delete
-- the previous object — the app no longer does that.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analysis_service_report_version (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id  uuid        NOT NULL REFERENCES public.analysis(id) ON DELETE CASCADE,
  file_path    text        NOT NULL,
  file_name    text        NULL,
  file_size    bigint      NULL,
  kind         text        NOT NULL,
  uploaded_by  uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_service_report_version_path_not_blank
    CHECK (btrim(file_path) <> ''),
  CONSTRAINT analysis_service_report_version_kind_check
    CHECK (kind IN ('upload', 'revision', 'reviewed', 'signed')),
  CONSTRAINT analysis_service_report_version_path_key
    UNIQUE (analysis_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_analysis_service_report_version_analysis
  ON public.analysis_service_report_version (analysis_id, uploaded_at DESC);

COMMENT ON TABLE public.analysis_service_report_version IS
  'Every service-report PDF that has been current on an analysis, including revisions and signature stamps.';

ALTER TABLE public.analysis_review_comment
  ADD COLUMN IF NOT EXISTS file_path text NULL,
  ADD COLUMN IF NOT EXISTS file_name text NULL;

COMMENT ON COLUMN public.analysis_review_comment.file_path IS
  'Storage key of the PDF that was current when this comment was written.';


-- ------------------------------------------------------------
-- Record a version whenever the current file pointer changes
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_service_report_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind      text;
  v_stamping  boolean;
  v_has_prior boolean;
  v_name      text;
BEGIN
  IF coalesce(btrim(NEW.service_report_file_path), '') = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.service_report_file_path IS NOT DISTINCT FROM OLD.service_report_file_path THEN
    RETURN NEW;
  END IF;

  v_stamping :=
    coalesce(current_setting('app.stamping_report', true), '') = 'true';
  v_name := lower(coalesce(NEW.service_report_file_name, ''));

  SELECT EXISTS (
    SELECT 1
    FROM public.analysis_service_report_version
    WHERE analysis_id = NEW.id
  ) INTO v_has_prior;

  IF v_stamping THEN
    IF v_name LIKE '%\_signed%' ESCAPE '\' OR v_name LIKE '%-approved%' THEN
      v_kind := 'signed';
    ELSE
      v_kind := 'reviewed';
    END IF;
  ELSIF NOT v_has_prior THEN
    v_kind := 'upload';
  ELSE
    v_kind := 'revision';
  END IF;

  INSERT INTO public.analysis_service_report_version (
    analysis_id, file_path, file_name, file_size, kind, uploaded_by, uploaded_at
  ) VALUES (
    NEW.id,
    NEW.service_report_file_path,
    NEW.service_report_file_name,
    NEW.service_report_file_size,
    v_kind,
    NEW.service_report_uploaded_by,
    coalesce(NEW.service_report_uploaded_at, now())
  )
  ON CONFLICT (analysis_id, file_path) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_record_service_report_version ON public.analysis;
CREATE TRIGGER analysis_record_service_report_version
  AFTER INSERT OR UPDATE OF service_report_file_path ON public.analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.record_service_report_version();


-- Existing records: keep whatever is currently pointed at.
INSERT INTO public.analysis_service_report_version (
  analysis_id, file_path, file_name, file_size, kind, uploaded_by, uploaded_at
)
SELECT
  a.id,
  a.service_report_file_path,
  a.service_report_file_name,
  a.service_report_file_size,
  CASE
    WHEN lower(coalesce(a.service_report_file_name, '')) LIKE '%\_signed%' ESCAPE '\'
      OR lower(coalesce(a.service_report_file_name, '')) LIKE '%-approved%'
      THEN 'signed'
    WHEN lower(coalesce(a.service_report_file_name, '')) LIKE '%-reviewed%'
      THEN 'reviewed'
    ELSE 'upload'
  END,
  a.service_report_uploaded_by,
  coalesce(a.service_report_uploaded_at, a.updated_at, now())
FROM public.analysis a
WHERE coalesce(btrim(a.service_report_file_path), '') <> ''
ON CONFLICT (analysis_id, file_path) DO NOTHING;


-- ------------------------------------------------------------
-- RLS: same read model as analysis / review comments
-- ------------------------------------------------------------

ALTER TABLE public.analysis_service_report_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service report versions accessible to staff"
  ON public.analysis_service_report_version;
CREATE POLICY "service report versions accessible to staff"
  ON public.analysis_service_report_version FOR ALL TO authenticated
  USING (public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member']))
  WITH CHECK (public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member']));

DROP POLICY IF EXISTS "service report versions select reviewing officers"
  ON public.analysis_service_report_version;
CREATE POLICY "service report versions select reviewing officers"
  ON public.analysis_service_report_version FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "service report versions select assigned officers"
  ON public.analysis_service_report_version;
CREATE POLICY "service report versions select assigned officers"
  ON public.analysis_service_report_version FOR SELECT TO authenticated
  USING (
    public.is_service_report_officer()
    AND public.is_assigned_analysis_officer(analysis_id)
  );


-- ------------------------------------------------------------
-- Snapshot the current PDF onto send-back / sign-off comments
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

  v_note := 'System: Revision requested by ' || v_actor || ' on ' || to_char(now(), 'YYYY-MM-DD');

  UPDATE public.analysis
  SET status_of_review = 'Revision requested',
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
