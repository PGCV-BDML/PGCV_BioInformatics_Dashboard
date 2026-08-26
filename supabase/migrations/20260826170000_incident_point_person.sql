-- Optional point person on incident reports: assignment, status history,
-- resolve/close stamps, and a notification when someone else is assigned.

ALTER TABLE public.incident_report
  ADD COLUMN IF NOT EXISTS point_person_id uuid NULL
    REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_by uuid NULL
    REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS closed_by uuid NULL
    REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone NULL;

CREATE INDEX IF NOT EXISTS idx_incident_report_point_person_id
  ON public.incident_report USING btree (point_person_id)
  WHERE point_person_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.incident_status_event (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  from_status public.incident_status NULL,
  to_status public.incident_status NOT NULL,
  changed_by uuid NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  note text NULL,
  CONSTRAINT incident_status_event_pkey PRIMARY KEY (id),
  CONSTRAINT incident_status_event_incident_id_fkey
    FOREIGN KEY (incident_id) REFERENCES public.incident_report (id)
    ON DELETE CASCADE,
  CONSTRAINT incident_status_event_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.users (id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_incident_status_event_incident_id
  ON public.incident_status_event USING btree (incident_id, changed_at DESC);

ALTER TABLE public.incident_status_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_status_event select staff"
  ON public.incident_status_event;
CREATE POLICY "incident_status_event select staff"
  ON public.incident_status_event FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

-- Writes go through SECURITY DEFINER triggers only.
DROP POLICY IF EXISTS "incident_status_event no direct insert"
  ON public.incident_status_event;
CREATE POLICY "incident_status_event no direct insert"
  ON public.incident_status_event FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "incident_status_event no direct update"
  ON public.incident_status_event;
CREATE POLICY "incident_status_event no direct update"
  ON public.incident_status_event FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "incident_status_event no direct delete"
  ON public.incident_status_event;
CREATE POLICY "incident_status_event no direct delete"
  ON public.incident_status_event FOR DELETE TO authenticated
  USING (false);

-- Point person (or reporter / lead) may update the row. Column limits for
-- a point person who is not the reporter are enforced in the BEFORE trigger.
DROP POLICY IF EXISTS "incident_report update own or lead"
  ON public.incident_report;
CREATE POLICY "incident_report update own or lead"
  ON public.incident_report FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND (
        reporter_id = auth.uid()
        OR point_person_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND (
        reporter_id = auth.uid()
        OR point_person_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.incident_report_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_allowed text[] := ARRAY[
    'status',
    'follow_up',
    'updated_at',
    'resolved_by',
    'resolved_at',
    'closed_by',
    'closed_at'
  ];
BEGIN
  IF NEW.point_person_id IS NOT NULL AND (
    TG_OP = 'INSERT'
    OR NEW.point_person_id IS DISTINCT FROM OLD.point_person_id
  ) THEN
    SELECT role INTO v_role
    FROM public.users
    WHERE id = NEW.point_person_id;

    IF v_role IS NULL OR v_role NOT IN ('team_lead', 'team_member') THEN
      RAISE EXCEPTION 'Point person must be a team lead or team member'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
    AND get_user_role() IS DISTINCT FROM 'team_lead'
    AND OLD.reporter_id IS DISTINCT FROM auth.uid()
    AND OLD.point_person_id = auth.uid()
  THEN
    IF (to_jsonb(NEW) - v_allowed) IS DISTINCT FROM (to_jsonb(OLD) - v_allowed) THEN
      RAISE EXCEPTION 'Point person may only update status and follow-up notes'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
    NEW.closed_by := NULL;
    NEW.closed_at := NULL;
    IF NEW.status = 'resolved' THEN
      NEW.resolved_by := auth.uid();
      NEW.resolved_at := now();
    ELSIF NEW.status = 'closed' THEN
      NEW.closed_by := auth.uid();
      NEW.closed_at := now();
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'resolved' THEN
      NEW.resolved_by := auth.uid();
      NEW.resolved_at := now();
    ELSIF NEW.status = 'closed' THEN
      NEW.closed_by := auth.uid();
      NEW.closed_at := now();
    END IF;
  ELSE
    NEW.resolved_by := OLD.resolved_by;
    NEW.resolved_at := OLD.resolved_at;
    NEW.closed_by := OLD.closed_by;
    NEW.closed_at := OLD.closed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incident_report_before_write ON public.incident_report;
CREATE TRIGGER incident_report_before_write
  BEFORE INSERT OR UPDATE ON public.incident_report
  FOR EACH ROW
  EXECUTE FUNCTION public.incident_report_before_write();

CREATE OR REPLACE FUNCTION public.incident_report_record_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.incident_status_event (
      incident_id, from_status, to_status, changed_by
    )
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.incident_status_event (
      incident_id, from_status, to_status, changed_by
    )
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incident_report_record_status_event
  ON public.incident_report;
CREATE TRIGGER incident_report_record_status_event
  AFTER INSERT OR UPDATE ON public.incident_report
  FOR EACH ROW
  EXECUTE FUNCTION public.incident_report_record_status_event();

CREATE OR REPLACE FUNCTION public.incident_report_notify_point_person()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
  v_existing uuid;
  v_reporter_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_target := NEW.point_person_id;
  ELSIF NEW.point_person_id IS DISTINCT FROM OLD.point_person_id THEN
    v_target := NEW.point_person_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_target IS NULL OR v_target = NEW.reporter_id THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing
  FROM public.notifications
  WHERE type = 'incident_assigned'
    AND target_user_id = v_target
    AND (payload->>'incident_id') = NEW.id::text
    AND is_read = false
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_reporter_name
  FROM public.users
  WHERE id = NEW.reporter_id;

  INSERT INTO public.notifications (type, payload, target_user_id)
  VALUES (
    'incident_assigned',
    jsonb_build_object(
      'incident_id', NEW.id,
      'title', NEW.title,
      'severity', NEW.severity,
      'category', NEW.category,
      'status', NEW.status,
      'reporter_name', v_reporter_name
    ),
    v_target
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incident_report_notify_point_person
  ON public.incident_report;
CREATE TRIGGER incident_report_notify_point_person
  AFTER INSERT OR UPDATE ON public.incident_report
  FOR EACH ROW
  EXECUTE FUNCTION public.incident_report_notify_point_person();
