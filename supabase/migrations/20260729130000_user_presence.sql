-- Staff presence / availability (leave, lab, travel, etc.)

DO $$ BEGIN
  CREATE TYPE public.presence_status AS ENUM (
    'in_office',
    'in_lab',
    'remote',
    'on_leave',
    'on_travel',
    'in_meeting',
    'unavailable'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid NOT NULL,
  status public.presence_status NOT NULL DEFAULT 'in_office',
  note text NULL,
  until_date date NULL,
  updated_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_presence_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT user_presence_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_presence_status
  ON public.user_presence USING btree (status);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_presence select staff" ON public.user_presence;
CREATE POLICY "user_presence select staff"
  ON public.user_presence FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "user_presence insert own or lead" ON public.user_presence;
CREATE POLICY "user_presence insert own or lead"
  ON public.user_presence FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_presence update own or lead" ON public.user_presence;
CREATE POLICY "user_presence update own or lead"
  ON public.user_presence FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_presence delete lead" ON public.user_presence;
CREATE POLICY "user_presence delete lead"
  ON public.user_presence FOR DELETE TO authenticated
  USING (get_user_role() = 'team_lead'::text);

DROP TRIGGER IF EXISTS set_updated_at ON public.user_presence;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
