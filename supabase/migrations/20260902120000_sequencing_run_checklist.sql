-- Sequencing Run Checklist — analyst reference board tied to Repository run IDs.
-- Separate from client sequence analysis (`analysis` / Service Report Tracker).

CREATE TABLE IF NOT EXISTS public.sequencing_run (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL,
  date_received date NOT NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sequencing_run_pkey PRIMARY KEY (id),
  CONSTRAINT sequencing_run_repository_id_key UNIQUE (repository_id),
  CONSTRAINT sequencing_run_repository_id_fkey
    FOREIGN KEY (repository_id) REFERENCES public.repository (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sequencing_run_date_received
  ON public.sequencing_run (date_received DESC);

CREATE TABLE IF NOT EXISTS public.sequencing_run_checklist_item (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sequencing_run_id uuid NOT NULL,
  client_name text NOT NULL,
  analysis_type text NOT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  is_complete boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sequencing_run_checklist_item_pkey PRIMARY KEY (id),
  CONSTRAINT sequencing_run_checklist_item_run_fkey
    FOREIGN KEY (sequencing_run_id) REFERENCES public.sequencing_run (id) ON DELETE CASCADE,
  CONSTRAINT sequencing_run_checklist_item_sample_count_nonneg
    CHECK (sample_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sequencing_run_checklist_item_run
  ON public.sequencing_run_checklist_item (sequencing_run_id, sort_order);

CREATE TABLE IF NOT EXISTS public.sequencing_run_checklist_analyst (
  checklist_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sequencing_run_checklist_analyst_pkey
    PRIMARY KEY (checklist_item_id, user_id),
  CONSTRAINT sequencing_run_checklist_analyst_item_fkey
    FOREIGN KEY (checklist_item_id)
    REFERENCES public.sequencing_run_checklist_item (id) ON DELETE CASCADE,
  CONSTRAINT sequencing_run_checklist_analyst_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sequencing_run_checklist_analyst_user
  ON public.sequencing_run_checklist_analyst (user_id);

ALTER TABLE public.sequencing_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequencing_run_checklist_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequencing_run_checklist_analyst ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sequencing_run is fully accessible to staff"
  ON public.sequencing_run;
CREATE POLICY "sequencing_run is fully accessible to staff"
  ON public.sequencing_run FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "sequencing_run_checklist_item is fully accessible to staff"
  ON public.sequencing_run_checklist_item;
CREATE POLICY "sequencing_run_checklist_item is fully accessible to staff"
  ON public.sequencing_run_checklist_item FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "sequencing_run_checklist_analyst is fully accessible to staff"
  ON public.sequencing_run_checklist_analyst;
CREATE POLICY "sequencing_run_checklist_analyst is fully accessible to staff"
  ON public.sequencing_run_checklist_analyst FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP TRIGGER IF EXISTS set_updated_at ON public.sequencing_run;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sequencing_run
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.sequencing_run_checklist_item;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sequencing_run_checklist_item
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
