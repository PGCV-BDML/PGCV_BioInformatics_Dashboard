-- ============================================================
-- 20260812140000_service_report_officer_roles.sql
--
-- External reviewing / approving officers are not bioinformatics
-- staff. They sign in, land on Notifications only, and act on
-- reports assigned to them (open PDF, review, approve, e-sign).
--
-- Access model mirrors trainees/interns: narrow role + RLS.
-- Officers never get full CRUD on analysis; status changes go
-- through SECURITY DEFINER RPCs that check assignment.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Roles
-- ------------------------------------------------------------

ALTER TYPE public.user_roles ADD VALUE IF NOT EXISTS 'reviewing_officer';
ALTER TYPE public.user_roles ADD VALUE IF NOT EXISTS 'approving_officer';


-- ------------------------------------------------------------
-- 2. Helpers
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_service_report_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role()::text = ANY (
    ARRAY['reviewing_officer', 'approving_officer']
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_analysis_officer(p_analysis_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.analysis a
    WHERE a.id = p_analysis_id
      AND (
        a.reviewer_user_id = auth.uid()
        OR a.approver_user_id = auth.uid()
      )
  );
$$;

-- storage.objects.name is the object key: {analysis_id}/{file}.pdf
CREATE OR REPLACE FUNCTION public.can_access_service_report_object(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    OR (
      public.is_service_report_officer()
      AND (storage.foldername(p_object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.is_assigned_analysis_officer(
        ((storage.foldername(p_object_name))[1])::uuid
      )
    );
$$;


-- ------------------------------------------------------------
-- 3. analysis — officers may SELECT only assigned rows
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "analysis select assigned officers" ON public.analysis;
CREATE POLICY "analysis select assigned officers"
  ON public.analysis FOR SELECT TO authenticated
  USING (
    public.is_service_report_officer()
    AND (
      reviewer_user_id = auth.uid()
      OR approver_user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- 4. analysis_review_comment — read assigned threads
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "analysis_review_comment select assigned officers"
  ON public.analysis_review_comment;
CREATE POLICY "analysis_review_comment select assigned officers"
  ON public.analysis_review_comment FOR SELECT TO authenticated
  USING (
    public.is_service_report_officer()
    AND public.is_assigned_analysis_officer(analysis_id)
  );


-- ------------------------------------------------------------
-- 5. Storage: service-reports — assigned officers read + stamp
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "service reports readable by assigned officers"
  ON storage.objects;
CREATE POLICY "service reports readable by assigned officers"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'service-reports'
    AND public.can_access_service_report_object(name)
  );

DROP POLICY IF EXISTS "service reports insertable by assigned officers"
  ON storage.objects;
CREATE POLICY "service reports insertable by assigned officers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'service-reports'
    AND public.is_service_report_officer()
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_assigned_analysis_officer(
      ((storage.foldername(name))[1])::uuid
    )
  );


-- ------------------------------------------------------------
-- 6. Storage: user-signatures — officers manage their own PNG
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "user signatures readable by staff" ON storage.objects;
CREATE POLICY "user signatures readable by staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY[
        'team_lead',
        'team_member',
        'intern',
        'trainee',
        'reviewing_officer',
        'approving_officer'
      ]
    )
  );

DROP POLICY IF EXISTS "user signatures insert own" ON storage.objects;
CREATE POLICY "user signatures insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY[
        'team_lead',
        'team_member',
        'intern',
        'trainee',
        'reviewing_officer',
        'approving_officer'
      ]
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user signatures update own" ON storage.objects;
CREATE POLICY "user signatures update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY[
        'team_lead',
        'team_member',
        'intern',
        'trainee',
        'reviewing_officer',
        'approving_officer'
      ]
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY[
        'team_lead',
        'team_member',
        'intern',
        'trainee',
        'reviewing_officer',
        'approving_officer'
      ]
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "user signatures delete own" ON storage.objects;
CREATE POLICY "user signatures delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-signatures'
    AND public.get_user_role()::text = ANY (
      ARRAY[
        'team_lead',
        'team_member',
        'intern',
        'trainee',
        'reviewing_officer',
        'approving_officer'
      ]
    )
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ------------------------------------------------------------
-- 7. RPCs: approval stage + stamped PDF path (no direct UPDATE)
-- ------------------------------------------------------------

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

  -- Match deriveLegacyStatus(): completion wins; "Approved" maps to submitted.
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

  RETURN jsonb_build_object('already_approved', false);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_analysis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_analysis(uuid) TO authenticated;


-- After client-side PDF stamp upload, point the analysis row at the new file.
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
