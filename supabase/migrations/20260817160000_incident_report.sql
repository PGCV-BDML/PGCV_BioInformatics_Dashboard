-- Staff-only incident log (lab, equipment, sample, privacy, facility).
-- Members may file and edit their own reports; team lead may manage all.

DO $$ BEGIN
  CREATE TYPE public.incident_category AS ENUM (
    'sample_data_handling',
    'equipment',
    'computational',
    'biosafety',
    'data_privacy',
    'facility',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incident_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incident_status AS ENUM (
    'open',
    'investigating',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.incident_location AS ENUM (
    'lab',
    'sequencer_room',
    'office',
    'server',
    'remote',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.incident_report (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  incident_date date NOT NULL,
  incident_time time NULL,
  location public.incident_location NOT NULL DEFAULT 'other',
  location_detail text NULL,
  category public.incident_category NOT NULL,
  severity public.incident_severity NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  immediate_action text NULL,
  people_involved text NULL,
  related_run_id text NULL,
  follow_up text NULL,
  reporter_id uuid NOT NULL,
  status public.incident_status NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT incident_report_pkey PRIMARY KEY (id),
  CONSTRAINT incident_report_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT incident_report_title_chk
    CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT incident_report_description_chk
    CHECK (char_length(btrim(description)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_incident_report_date
  ON public.incident_report USING btree (incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_incident_report_status
  ON public.incident_report USING btree (status);

CREATE INDEX IF NOT EXISTS idx_incident_report_reporter_id
  ON public.incident_report USING btree (reporter_id);

CREATE INDEX IF NOT EXISTS idx_incident_report_run_id
  ON public.incident_report (related_run_id)
  WHERE related_run_id IS NOT NULL;

ALTER TABLE public.incident_report ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_report select staff" ON public.incident_report;
CREATE POLICY "incident_report select staff"
  ON public.incident_report FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "incident_report insert staff own" ON public.incident_report;
CREATE POLICY "incident_report insert staff own"
  ON public.incident_report FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND reporter_id = auth.uid()
  );

DROP POLICY IF EXISTS "incident_report update own or lead" ON public.incident_report;
CREATE POLICY "incident_report update own or lead"
  ON public.incident_report FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND reporter_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND reporter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "incident_report delete own or lead" ON public.incident_report;
CREATE POLICY "incident_report delete own or lead"
  ON public.incident_report FOR DELETE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND reporter_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_updated_at ON public.incident_report;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.incident_report
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS on_incident_report_change_audit ON public.incident_report;
CREATE TRIGGER on_incident_report_change_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_report
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_table_change();
