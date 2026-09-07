-- Ask assignees whether open work that has passed its due date is already
-- done. INSERT into notifications then rides the existing web-push dispatch
-- trigger.
--
-- One row per person per task due date. A daily cron catches tasks that roll
-- past due overnight; row triggers ping immediately when a date is already
-- in the past.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_task_past_due_once
  ON public.notifications (
    target_user_id,
    ((payload->>'task_id')),
    ((payload->>'due_date'))
  )
  WHERE type = 'task_past_due';

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

REVOKE ALL ON FUNCTION public.notify_task_past_due(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_task_past_due(uuid, timestamptz)
  TO postgres, service_role;

REVOKE ALL ON FUNCTION public.enqueue_task_past_due_notifications(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_task_past_due_notifications(timestamptz)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.task_past_due_notify_row()
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

  PERFORM public.notify_task_past_due(v_task_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS task_past_due_notify ON public.task;
CREATE TRIGGER task_past_due_notify
  AFTER INSERT OR UPDATE ON public.task
  FOR EACH ROW
  EXECUTE FUNCTION public.task_past_due_notify_row();

DROP TRIGGER IF EXISTS task_assignee_past_due_notify ON public.task_assignee;
CREATE TRIGGER task_assignee_past_due_notify
  AFTER INSERT OR UPDATE ON public.task_assignee
  FOR EACH ROW
  EXECUTE FUNCTION public.task_past_due_notify_row();

-- Same midnight-ish Asia/Manila window as coming-up reminders.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron is not available: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('enqueue-task-past-due');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'enqueue-task-past-due',
    '5 16 * * *',
    $cmd$SELECT public.enqueue_task_past_due_notifications()$cmd$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'did not schedule task past-due cron: %', SQLERRM;
END $$;

-- Backfill anyone already past due.
SELECT public.enqueue_task_past_due_notifications();
