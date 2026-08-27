-- ============================================================
-- 20260827140000_reviewing_officer_sequence_analysis_read.sql
--
-- Reviewing officers may browse Sequence Analysis (dashboard,
-- tracker, detail) for every record: open links and download
-- PDFs. They still cannot INSERT/UPDATE/DELETE those rows.
-- Review / e-sign actions stay on Notifications (assigned RPCs).
--
-- Approving officers stay on the assigned-only Notifications
-- model from 20260812140000_service_report_officer_roles.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_reviewing_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role()::text = 'reviewing_officer';
$$;

REVOKE ALL ON FUNCTION public.is_reviewing_officer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reviewing_officer() TO authenticated;


-- ------------------------------------------------------------
-- analysis + review comments: full SELECT for reviewing officers
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "analysis select reviewing officers" ON public.analysis;
CREATE POLICY "analysis select reviewing officers"
  ON public.analysis FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "analysis_review_comment select reviewing officers"
  ON public.analysis_review_comment;
CREATE POLICY "analysis_review_comment select reviewing officers"
  ON public.analysis_review_comment FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());


-- ------------------------------------------------------------
-- Lookups the tracker / detail / dashboard join for display
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "users select reviewing officers" ON public.users;
CREATE POLICY "users select reviewing officers"
  ON public.users FOR SELECT TO authenticated
  USING (
    public.is_reviewing_officer()
    AND role::text = ANY (
      ARRAY[
        'team_lead',
        'team_member',
        'reviewing_officer',
        'approving_officer'
      ]
    )
  );

DROP POLICY IF EXISTS "project select reviewing officers" ON public.project;
CREATE POLICY "project select reviewing officers"
  ON public.project FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "service select reviewing officers" ON public.service;
CREATE POLICY "service select reviewing officers"
  ON public.service FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "client select reviewing officers" ON public.client;
CREATE POLICY "client select reviewing officers"
  ON public.client FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "repository select reviewing officers" ON public.repository;
CREATE POLICY "repository select reviewing officers"
  ON public.repository FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "service_report select reviewing officers"
  ON public.service_report;
CREATE POLICY "service_report select reviewing officers"
  ON public.service_report FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());


-- ------------------------------------------------------------
-- Storage: reviewing officers may download every service-report PDF.
-- INSERT (e-sign stamps) stays assigned-only.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_service_report_object(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    OR public.is_reviewing_officer()
    OR (
      public.is_service_report_officer()
      AND (storage.foldername(p_object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.is_assigned_analysis_officer(
        ((storage.foldername(p_object_name))[1])::uuid
      )
    );
$$;
