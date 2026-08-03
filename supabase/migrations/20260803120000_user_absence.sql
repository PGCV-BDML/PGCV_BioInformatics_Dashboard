-- Per-day staff absence records (leave, travel, etc.) for Team + Calendar.

CREATE TABLE IF NOT EXISTS public.user_absence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  absence_date date NOT NULL,
  status public.presence_status NOT NULL,
  note text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_absence_pkey PRIMARY KEY (id),
  CONSTRAINT user_absence_user_date_unique UNIQUE (user_id, absence_date),
  CONSTRAINT user_absence_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT user_absence_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_absence_date
  ON public.user_absence USING btree (absence_date);

CREATE INDEX IF NOT EXISTS idx_user_absence_user_id
  ON public.user_absence USING btree (user_id);

ALTER TABLE public.user_absence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_absence select staff" ON public.user_absence;
CREATE POLICY "user_absence select staff"
  ON public.user_absence FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "user_absence insert own or lead" ON public.user_absence;
CREATE POLICY "user_absence insert own or lead"
  ON public.user_absence FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_absence update own or lead" ON public.user_absence;
CREATE POLICY "user_absence update own or lead"
  ON public.user_absence FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "user_absence delete own or lead" ON public.user_absence;
CREATE POLICY "user_absence delete own or lead"
  ON public.user_absence FOR DELETE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_updated_at ON public.user_absence;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_absence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
