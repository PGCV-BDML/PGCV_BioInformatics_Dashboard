-- ============================================================
-- 20260827200000_personal_task_repository.sql
--
-- Personal checkbox on tasks and repository links. Shared stays
-- the default. Personal rows are visible only to their owner —
-- including hiding them from team leads. Sequence analysis tasks
-- cannot be personal.
-- ============================================================

ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id uuid NULL REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.repository
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id uuid NULL REFERENCES public.users(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_personal_needs_owner'
  ) THEN
    ALTER TABLE public.task
      ADD CONSTRAINT task_personal_needs_owner
      CHECK (NOT is_personal OR owner_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_personal_not_analysis'
  ) THEN
    ALTER TABLE public.task
      ADD CONSTRAINT task_personal_not_analysis
      CHECK (NOT is_personal OR linked_analysis_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repository_personal_needs_owner'
  ) THEN
    ALTER TABLE public.repository
      ADD CONSTRAINT repository_personal_needs_owner
      CHECK (NOT is_personal OR owner_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_personal_owner
  ON public.task (owner_id)
  WHERE is_personal;

CREATE INDEX IF NOT EXISTS idx_repository_personal_owner
  ON public.repository (owner_id)
  WHERE is_personal;


CREATE OR REPLACE FUNCTION public.can_access_owned_row(
  p_is_personal boolean,
  p_owner_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    AND (
      NOT coalesce(p_is_personal, false)
      OR p_owner_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_owned_row(boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_owned_row(boolean, uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.set_owned_row_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.owner_id := auth.uid();
  ELSE
    IF OLD.owner_id IS NULL THEN
      NEW.owner_id := coalesce(NEW.owner_id, auth.uid());
    ELSE
      NEW.owner_id := OLD.owner_id;
    END IF;

    IF NEW.is_personal IS DISTINCT FROM OLD.is_personal
       AND OLD.owner_id IS NOT NULL
       AND OLD.owner_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the owner can change Personal';
    END IF;
  END IF;

  v_linked := to_jsonb(NEW)->>'linked_analysis_id';
  IF NEW.is_personal AND coalesce(v_linked, '') <> '' THEN
    RAISE EXCEPTION 'Sequence analysis tasks cannot be personal';
  END IF;

  IF NEW.is_personal AND NEW.owner_id IS NULL THEN
    RAISE EXCEPTION 'Personal items need an owner';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_set_owned_row_owner ON public.task;
CREATE TRIGGER task_set_owned_row_owner
  BEFORE INSERT OR UPDATE ON public.task
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owned_row_owner();

DROP TRIGGER IF EXISTS repository_set_owned_row_owner ON public.repository;
CREATE TRIGGER repository_set_owned_row_owner
  BEFORE INSERT OR UPDATE ON public.repository
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owned_row_owner();


-- ------------------------------------------------------------
-- task
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "task read all authenticated" ON public.task;
DROP POLICY IF EXISTS "task read staff" ON public.task;
DROP POLICY IF EXISTS "task insert staff" ON public.task;
DROP POLICY IF EXISTS "task update staff" ON public.task;
DROP POLICY IF EXISTS "task delete staff" ON public.task;

CREATE POLICY "task select staff owned"
  ON public.task FOR SELECT TO authenticated
  USING (public.can_access_owned_row(is_personal, owner_id));

CREATE POLICY "task insert staff owned"
  ON public.task FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    AND owner_id = auth.uid()
  );

CREATE POLICY "task update staff owned"
  ON public.task FOR UPDATE TO authenticated
  USING (public.can_access_owned_row(is_personal, owner_id))
  WITH CHECK (public.can_access_owned_row(is_personal, owner_id));

CREATE POLICY "task delete staff owned"
  ON public.task FOR DELETE TO authenticated
  USING (public.can_access_owned_row(is_personal, owner_id));


-- ------------------------------------------------------------
-- repository
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "repository is fully accessible to staff" ON public.repository;
DROP POLICY IF EXISTS "repository select reviewing officers" ON public.repository;

CREATE POLICY "repository select staff owned"
  ON public.repository FOR SELECT TO authenticated
  USING (public.can_access_owned_row(is_personal, owner_id));

CREATE POLICY "repository insert staff owned"
  ON public.repository FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    AND owner_id = auth.uid()
  );

CREATE POLICY "repository update staff owned"
  ON public.repository FOR UPDATE TO authenticated
  USING (public.can_access_owned_row(is_personal, owner_id))
  WITH CHECK (public.can_access_owned_row(is_personal, owner_id));

CREATE POLICY "repository delete staff owned"
  ON public.repository FOR DELETE TO authenticated
  USING (public.can_access_owned_row(is_personal, owner_id));

CREATE POLICY "repository select reviewing officers"
  ON public.repository FOR SELECT TO authenticated
  USING (
    public.is_reviewing_officer()
    AND NOT coalesce(is_personal, false)
  );


-- ------------------------------------------------------------
-- Child rows follow the parent
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "task_tag read all authenticated" ON public.task_tag;
DROP POLICY IF EXISTS "task_tag read staff" ON public.task_tag;
DROP POLICY IF EXISTS "task_tag insert staff" ON public.task_tag;
DROP POLICY IF EXISTS "task_tag update staff" ON public.task_tag;
DROP POLICY IF EXISTS "task_tag delete staff" ON public.task_tag;

CREATE POLICY "task_tag select staff owned"
  ON public.task_tag FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

CREATE POLICY "task_tag insert staff owned"
  ON public.task_tag FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

CREATE POLICY "task_tag update staff owned"
  ON public.task_tag FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

CREATE POLICY "task_tag delete staff owned"
  ON public.task_tag FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

DROP POLICY IF EXISTS "task_assignee read staff" ON public.task_assignee;
DROP POLICY IF EXISTS "task_assignee insert staff" ON public.task_assignee;
DROP POLICY IF EXISTS "task_assignee update staff" ON public.task_assignee;
DROP POLICY IF EXISTS "task_assignee delete staff" ON public.task_assignee;

CREATE POLICY "task_assignee select staff owned"
  ON public.task_assignee FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

CREATE POLICY "task_assignee insert staff owned"
  ON public.task_assignee FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

CREATE POLICY "task_assignee update staff owned"
  ON public.task_assignee FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

CREATE POLICY "task_assignee delete staff owned"
  ON public.task_assignee FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task t
      WHERE t.id = task_id
        AND public.can_access_owned_row(t.is_personal, t.owner_id)
    )
  );

DROP POLICY IF EXISTS "repository_tag is fully accessible to staff"
  ON public.repository_tag;

CREATE POLICY "repository_tag select staff owned"
  ON public.repository_tag FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repository r
      WHERE r.id = repository_id
        AND public.can_access_owned_row(r.is_personal, r.owner_id)
    )
  );

CREATE POLICY "repository_tag insert staff owned"
  ON public.repository_tag FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repository r
      WHERE r.id = repository_id
        AND public.can_access_owned_row(r.is_personal, r.owner_id)
    )
  );

CREATE POLICY "repository_tag update staff owned"
  ON public.repository_tag FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repository r
      WHERE r.id = repository_id
        AND public.can_access_owned_row(r.is_personal, r.owner_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repository r
      WHERE r.id = repository_id
        AND public.can_access_owned_row(r.is_personal, r.owner_id)
    )
  );

CREATE POLICY "repository_tag delete staff owned"
  ON public.repository_tag FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repository r
      WHERE r.id = repository_id
        AND public.can_access_owned_row(r.is_personal, r.owner_id)
    )
  );

DROP POLICY IF EXISTS "repository_tag select reviewing officers"
  ON public.repository_tag;
CREATE POLICY "repository_tag select reviewing officers"
  ON public.repository_tag FOR SELECT TO authenticated
  USING (
    public.is_reviewing_officer()
    AND EXISTS (
      SELECT 1 FROM public.repository r
      WHERE r.id = repository_id
        AND NOT coalesce(r.is_personal, false)
    )
  );
