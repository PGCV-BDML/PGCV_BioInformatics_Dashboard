-- Reviewing officers may browse the Sequencing Run Checklist (view-only).
-- Staff keep full access from 20260902120000_sequencing_run_checklist.sql.
-- Repository and staff user lookups are already readable via
-- 20260827140000 / 20260827200000.

DROP POLICY IF EXISTS "sequencing_run select reviewing officers"
  ON public.sequencing_run;
CREATE POLICY "sequencing_run select reviewing officers"
  ON public.sequencing_run FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "sequencing_run_checklist_item select reviewing officers"
  ON public.sequencing_run_checklist_item;
CREATE POLICY "sequencing_run_checklist_item select reviewing officers"
  ON public.sequencing_run_checklist_item FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());

DROP POLICY IF EXISTS "sequencing_run_checklist_analyst select reviewing officers"
  ON public.sequencing_run_checklist_analyst;
CREATE POLICY "sequencing_run_checklist_analyst select reviewing officers"
  ON public.sequencing_run_checklist_analyst FOR SELECT TO authenticated
  USING (public.is_reviewing_officer());
