-- Multiple assignees per task (junction), while still allowing unassigned.
-- Analysis-linked tasks stay at most one assignee. Status remains on task.

ALTER TABLE public.task
  ALTER COLUMN assignee_id DROP NOT NULL;

COMMENT ON COLUMN public.task.assignee_id IS
  'Denormalized primary assignee (first selected). Null when unassigned.';

CREATE TABLE IF NOT EXISTS public.task_assignee (
  task_id uuid NOT NULL REFERENCES public.task(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignee_user_id
  ON public.task_assignee USING btree (user_id);

INSERT INTO public.task_assignee (task_id, user_id)
SELECT id, assignee_id
FROM public.task
WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.task_assignee ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignee read staff" ON public.task_assignee;
CREATE POLICY "task_assignee read staff"
  ON public.task_assignee FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task_assignee insert staff" ON public.task_assignee;
CREATE POLICY "task_assignee insert staff"
  ON public.task_assignee FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task_assignee update staff" ON public.task_assignee;
CREATE POLICY "task_assignee update staff"
  ON public.task_assignee FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "task_assignee delete staff" ON public.task_assignee;
CREATE POLICY "task_assignee delete staff"
  ON public.task_assignee FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

CREATE OR REPLACE FUNCTION public.enforce_analysis_task_single_assignee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_task_id uuid;
  v_linked uuid;
  v_count integer;
BEGIN
  IF TG_TABLE_NAME = 'task' THEN
    v_task_id := NEW.id;
    v_linked := NEW.linked_analysis_id;
  ELSE
    v_task_id := COALESCE(NEW.task_id, OLD.task_id);
    SELECT linked_analysis_id INTO v_linked
    FROM public.task
    WHERE id = v_task_id;
  END IF;

  IF v_linked IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*) INTO v_count
  FROM public.task_assignee
  WHERE task_id = v_task_id;

  IF v_count > 1 THEN
    RAISE EXCEPTION 'Analysis-linked tasks can have at most one assignee'
      USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS task_assignee_analysis_limit ON public.task_assignee;
CREATE TRIGGER task_assignee_analysis_limit
  AFTER INSERT OR UPDATE ON public.task_assignee
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_analysis_task_single_assignee();

DROP TRIGGER IF EXISTS task_analysis_assignee_limit ON public.task;
CREATE TRIGGER task_analysis_assignee_limit
  AFTER UPDATE OF linked_analysis_id ON public.task
  FOR EACH ROW
  WHEN (NEW.linked_analysis_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_analysis_task_single_assignee();
