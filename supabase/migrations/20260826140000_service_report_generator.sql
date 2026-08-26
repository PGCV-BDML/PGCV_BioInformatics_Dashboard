-- Live addresses for the Service Report Generator launchpad.
-- Titles/descriptions stay in the app catalog; hrefs are edited in-dashboard
-- because the lab machine IP changes without a deploy.

CREATE TABLE IF NOT EXISTS public.service_report_generator (
  id text NOT NULL,
  href text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL,
  CONSTRAINT service_report_generator_pkey PRIMARY KEY (id),
  CONSTRAINT service_report_generator_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE SET NULL
);

ALTER TABLE public.service_report_generator ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_report_generator is fully accessible to staff"
  ON public.service_report_generator;
CREATE POLICY "service_report_generator is fully accessible to staff"
  ON public.service_report_generator FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP TRIGGER IF EXISTS set_updated_at ON public.service_report_generator;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.service_report_generator
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS on_service_report_generator_change_audit
  ON public.service_report_generator;
CREATE TRIGGER on_service_report_generator_change_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.service_report_generator
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_table_change();

INSERT INTO public.service_report_generator (id, href)
VALUES
  ('amplicon-assembly', 'http://10.49.42.113:5050'),
  ('whole-genome-assembly', 'http://10.49.42.113:5051'),
  ('16s-metabarcoding', 'http://10.49.42.113:5070')
ON CONFLICT (id) DO NOTHING;
