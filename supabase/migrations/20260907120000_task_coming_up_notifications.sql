-- Remind assignees of Tour / Events / Meeting / Training tasks that start
-- today or tomorrow (Asia/Manila). INSERT into notifications then rides the
-- existing web-push dispatch trigger.
--
-- One row per person per task start date. Creating a tour for tomorrow pings
-- immediately via triggers; a daily cron catches tasks that roll into the
-- window overnight.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_task_coming_up_once
  ON public.notifications (
    target_user_id,
    ((payload->>'task_id')),
    ((payload->>'start_date'))
  )
  WHERE type = 'task_coming_up';

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

REVOKE ALL ON FUNCTION public.notify_task_coming_up(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_task_coming_up(uuid, timestamptz)
  TO postgres, service_role;

REVOKE ALL ON FUNCTION public.enqueue_task_coming_up_notifications(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_task_coming_up_notifications(timestamptz)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.task_coming_up_notify_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'task' THEN
    v_task_id := COALESCE(NEW.id, OLD.id);
  ELSE
    v_task_id := COALESCE(NEW.task_id, OLD.task_id);
  END IF;

  PERFORM public.notify_task_coming_up(v_task_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS task_coming_up_notify ON public.task;
CREATE TRIGGER task_coming_up_notify
  AFTER INSERT OR UPDATE ON public.task
  FOR EACH ROW
  EXECUTE FUNCTION public.task_coming_up_notify_row();

DROP TRIGGER IF EXISTS task_tag_coming_up_notify ON public.task_tag;
CREATE TRIGGER task_tag_coming_up_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.task_tag
  FOR EACH ROW
  EXECUTE FUNCTION public.task_coming_up_notify_row();

DROP TRIGGER IF EXISTS task_assignee_coming_up_notify ON public.task_assignee;
CREATE TRIGGER task_assignee_coming_up_notify
  AFTER INSERT OR UPDATE ON public.task_assignee
  FOR EACH ROW
  EXECUTE FUNCTION public.task_coming_up_notify_row();

-- Midnight-ish Asia/Manila (UTC+8, no DST). Harmless if pg_cron is absent;
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
  PERFORM cron.schedule(
    'enqueue-task-coming-up',
    '5 16 * * *',
    $cmd$SELECT public.enqueue_task_coming_up_notifications()$cmd$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'did not schedule task coming-up cron: %', SQLERRM;
END $$;

-- Backfill anyone already in the today/tomorrow window.
SELECT public.enqueue_task_coming_up_notifications();
