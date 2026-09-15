-- Approving officers may browse the COVID-19 Sample Tracker (view-only).
-- Staff keep full access from 20260812120000_covid_sequencing_run.sql.

DROP POLICY IF EXISTS "covid_sequencing_run select approving officers"
  ON public.covid_sequencing_run;
CREATE POLICY "covid_sequencing_run select approving officers"
  ON public.covid_sequencing_run FOR SELECT TO authenticated
  USING (get_user_role() = 'approving_officer'::text);
