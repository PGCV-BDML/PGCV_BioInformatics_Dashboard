-- Quiet hours: 6:00 AM–6:00 PM Asia/Manila (hour 6 inclusive, 18 exclusive).
-- Past-due / coming-up rows are not inserted at night; other notification
-- types still land in the inbox, but web push waits until morning.

CREATE OR REPLACE FUNCTION public.is_notification_hours(
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXTRACT(HOUR FROM (p_now AT TIME ZONE 'Asia/Manila'))::int >= 6
     AND EXTRACT(HOUR FROM (p_now AT TIME ZONE 'Asia/Manila'))::int < 18;
$$;

REVOKE ALL ON FUNCTION public.is_notification_hours(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_notification_hours(timestamptz)
  TO postgres, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.pending_push_dispatch (
  notification_id uuid PRIMARY KEY
    REFERENCES public.notifications(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_push_dispatch ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.post_notification_web_push(
  p_id uuid,
  p_type text,
  p_payload jsonb,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings public.push_dispatch_settings%ROWTYPE;
  req_headers jsonb;
  req_body jsonb;
BEGIN
  SELECT * INTO settings FROM public.push_dispatch_settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || settings.dispatch_secret
  );
  req_body := jsonb_build_object(
    'id', p_id,
    'type', p_type,
    'payload', p_payload,
    'target_user_id', p_target_user_id
  );

  EXECUTE
    'SELECT net.http_post(url := $1, body := $2::jsonb, headers := $3::jsonb, timeout_milliseconds := $4)'
    USING settings.dispatch_url, req_body, req_headers, 5000;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'web push dispatch failed: %', SQLERRM;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.post_notification_web_push(uuid, text, jsonb, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_notification_web_push(uuid, text, jsonb, uuid)
  TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.dispatch_notification_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_notification_hours() THEN
    INSERT INTO public.pending_push_dispatch (notification_id)
    VALUES (NEW.id)
    ON CONFLICT (notification_id) DO NOTHING;
    RETURN NEW;
  END IF;

  PERFORM public.post_notification_web_push(
    NEW.id,
    NEW.type,
    NEW.payload,
    NEW.target_user_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.flush_deferred_push_dispatches(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_flushed integer := 0;
BEGIN
  IF NOT public.is_notification_hours(p_now) THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT n.id, n.type, n.payload, n.target_user_id
    FROM public.pending_push_dispatch p
    INNER JOIN public.notifications n ON n.id = p.notification_id
    ORDER BY p.created_at, n.id
  LOOP
    IF public.post_notification_web_push(
      r.id,
      r.type,
      r.payload,
      r.target_user_id
    ) THEN
      DELETE FROM public.pending_push_dispatch WHERE notification_id = r.id;
      v_flushed := v_flushed + 1;
    END IF;
  END LOOP;

  RETURN v_flushed;
END;
$$;

REVOKE ALL ON FUNCTION public.flush_deferred_push_dispatches(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flush_deferred_push_dispatches(timestamptz)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_task_coming_up(
  p_task_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.task%ROWTYPE;
  v_today date;
  v_tomorrow date;
  v_start date;
  v_when text;
  v_cats jsonb;
  v_uid uuid;
  v_inserted integer := 0;
BEGIN
  IF p_task_id IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT public.is_notification_hours(p_now) THEN
    RETURN 0;
  END IF;

  SELECT * INTO t FROM public.task WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF t.linked_analysis_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  IF t.status IN ('completed', 'cancelled', 'on_hold') THEN
    RETURN 0;
  END IF;

  v_start := coalesce(t.start_date, t.due_date);
  IF v_start IS NULL THEN
    RETURN 0;
  END IF;

  v_today := (p_now AT TIME ZONE 'Asia/Manila')::date;
  v_tomorrow := v_today + 1;

  IF v_start = v_today THEN
    v_when := 'today';
  ELSIF v_start = v_tomorrow THEN
    v_when := 'tomorrow';
  ELSE
    RETURN 0;
  END IF;

  SELECT coalesce(
    jsonb_agg(tt.category::text ORDER BY tt.category::text),
    '[]'::jsonb
  )
  INTO v_cats
  FROM public.task_tag tt
  WHERE tt.task_id = t.id
    AND tt.category IN ('tour', 'events', 'meeting', 'training');

  IF v_cats IS NULL OR v_cats = '[]'::jsonb THEN
    RETURN 0;
  END IF;

  FOR v_uid IN
    SELECT DISTINCT audience.uid
    FROM (
      SELECT ta.user_id AS uid
      FROM public.task_assignee ta
      WHERE ta.task_id = t.id
      UNION
      SELECT tsk.owner_id
      FROM public.task tsk
      WHERE tsk.id = t.id
        AND tsk.is_personal
        AND tsk.owner_id IS NOT NULL
    ) audience
    WHERE audience.uid IS NOT NULL
  LOOP
    BEGIN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES (
        'task_coming_up',
        jsonb_build_object(
          'task_id', t.id,
          'title', t.title,
          'start_date', v_start::text,
          'task_time', t.task_time::text,
          'details', t.details,
          'categories', v_cats,
          'when', v_when
        ),
        v_uid
      );
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_task_coming_up_notifications(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_tomorrow date;
  r record;
  v_total integer := 0;
BEGIN
  IF NOT public.is_notification_hours(p_now) THEN
    RETURN 0;
  END IF;

  v_today := (p_now AT TIME ZONE 'Asia/Manila')::date;
  v_tomorrow := v_today + 1;

  FOR r IN
    SELECT DISTINCT t.id
    FROM public.task t
    INNER JOIN public.task_tag tt ON tt.task_id = t.id
    WHERE t.linked_analysis_id IS NULL
      AND t.status NOT IN ('completed', 'cancelled', 'on_hold')
      AND coalesce(t.start_date, t.due_date) IN (v_today, v_tomorrow)
      AND tt.category IN ('tour', 'events', 'meeting', 'training')
  LOOP
    v_total := v_total + public.notify_task_coming_up(r.id, p_now);
  END LOOP;

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_past_due(
  p_task_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.task%ROWTYPE;
  v_today date;
  v_due date;
  v_uid uuid;
  v_inserted integer := 0;
BEGIN
  IF p_task_id IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT public.is_notification_hours(p_now) THEN
    RETURN 0;
  END IF;

  SELECT * INTO t FROM public.task WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF t.linked_analysis_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  IF t.status IN ('completed', 'cancelled', 'on_hold') THEN
    RETURN 0;
  END IF;

  v_due := coalesce(t.end_date, t.start_date, t.due_date);
  IF v_due IS NULL THEN
    RETURN 0;
  END IF;

  v_today := (p_now AT TIME ZONE 'Asia/Manila')::date;
  IF v_due >= v_today THEN
    RETURN 0;
  END IF;

  FOR v_uid IN
    SELECT DISTINCT audience.uid
    FROM (
      SELECT ta.user_id AS uid
      FROM public.task_assignee ta
      WHERE ta.task_id = t.id
      UNION
      SELECT tsk.owner_id
      FROM public.task tsk
      WHERE tsk.id = t.id
        AND tsk.is_personal
        AND tsk.owner_id IS NOT NULL
    ) audience
    WHERE audience.uid IS NOT NULL
  LOOP
    BEGIN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES (
        'task_past_due',
        jsonb_build_object(
          'task_id', t.id,
          'title', t.title,
          'due_date', v_due::text,
          'start_date', t.start_date::text,
          'details', t.details
        ),
        v_uid
      );
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_task_past_due_notifications(
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  r record;
  v_total integer := 0;
BEGIN
  IF NOT public.is_notification_hours(p_now) THEN
    RETURN 0;
  END IF;

  v_today := (p_now AT TIME ZONE 'Asia/Manila')::date;

  FOR r IN
    SELECT t.id
    FROM public.task t
    WHERE t.linked_analysis_id IS NULL
      AND t.status NOT IN ('completed', 'cancelled', 'on_hold')
      AND coalesce(t.end_date, t.start_date, t.due_date) < v_today
  LOOP
    v_total := v_total + public.notify_task_past_due(r.id, p_now);
  END LOOP;

  RETURN v_total;
END;
$$;

-- 6:05 AM Asia/Manila (UTC+8, no DST). Harmless if pg_cron is absent;
-- Vercel cron at /api/cron/task-reminders is the other runner.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron is not available: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('enqueue-task-coming-up');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('enqueue-task-past-due');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('run-notification-hour-jobs');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'run-notification-hour-jobs',
    '5 22 * * *',
    $cmd$SELECT public.enqueue_task_coming_up_notifications();
SELECT public.enqueue_task_past_due_notifications();
SELECT public.flush_deferred_push_dispatches();$cmd$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'did not schedule notification-hours cron: %', SQLERRM;
END $$;
