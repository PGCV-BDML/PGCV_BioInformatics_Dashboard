-- ============================================================
-- rollback-project-registry-import.sql
--
-- Undoes the 2026-07-30 import of public.projects into
-- public.project. Run in the Supabase SQL Editor.
--
-- Returns public.project to its pre-import state: 3 rows, the
-- original NOT NULL constraints, no registry metadata columns.
--
-- public.projects is NOT touched — it was only ever read from,
-- and still holds all 192 rows. Nothing is lost by running this.
-- ============================================================

BEGIN;

-- ---- Guard: the source table must still be intact ----------
-- Deleting the imported rows is only safe while public.projects
-- still holds them.
DO $$
DECLARE n bigint;
BEGIN
  IF to_regclass('public.projects') IS NULL THEN
    RAISE EXCEPTION 'public.projects is gone — rollback would lose the 192 rows';
  END IF;

  SELECT count(*) INTO n FROM public.projects;
  IF n <> 192 THEN
    RAISE EXCEPTION 'expected 192 rows in public.projects, found % — stopping', n;
  END IF;
END $$;

-- ---- Guard: no imported row has picked up children ---------
-- If anything was linked to an imported project since the import,
-- deleting it would fail on a foreign key. Report clearly instead.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
  FROM public.projects p
  WHERE EXISTS (SELECT 1 FROM public.analysis a WHERE a.project_id     = p.id)
     OR EXISTS (SELECT 1 FROM public.sample   s WHERE s.project_id     = p.id)
     OR EXISTS (SELECT 1 FROM public.task     t WHERE t.linked_project_id = p.id);

  IF n > 0 THEN
    RAISE EXCEPTION
      '% imported projects now have analysis/sample/task children; resolve before rollback', n;
  END IF;
END $$;

-- ---- 1. Drop the uniqueness constraint added on import -----
ALTER TABLE public.project DROP CONSTRAINT IF EXISTS project_project_id_key;

-- ---- 2. Remove the 192 imported rows -----------------------
-- Matched by id: imported rows kept their original UUIDs, and the
-- 3 pre-existing rows have UUIDs that appear nowhere in projects.
DELETE FROM public.project q
WHERE EXISTS (SELECT 1 FROM public.projects p WHERE p.id = q.id);

-- ---- 3. Restore the original demo project codes ------------
-- These 3 were parked on temp codes during the import and then
-- re-issued above the historical series. Their codes are free again
-- now that the imported rows are gone.
UPDATE public.project SET project_id = 'P-2026-002'
  WHERE name = 'Anti Microbial Peptides';
UPDATE public.project SET project_id = 'P-2026-003'
  WHERE name = 'Pangenome Analysis on Bathroom Plastics';
UPDATE public.project SET project_id = 'P-2026-004'
  WHERE name = 'Transcriptomics EVIARC';

-- ---- 4. Drop the registry metadata columns -----------------
ALTER TABLE public.project
  DROP COLUMN IF EXISTS sending_institution,
  DROP COLUMN IF EXISTS funding_category,
  DROP COLUMN IF EXISTS funding_institution,
  DROP COLUMN IF EXISTS personnel_assigned,
  DROP COLUMN IF EXISTS project_lead;

-- ---- Guard: nothing left that would block NOT NULL ---------
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.project
  WHERE client_id IS NULL OR service_id IS NULL
     OR lead_user_id IS NULL OR start_date IS NULL;

  IF n > 0 THEN
    RAISE EXCEPTION
      '% remaining rows have nulls in the operational columns; cannot restore NOT NULL', n;
  END IF;
END $$;

-- ---- 5. Restore the original constraints -------------------
ALTER TABLE public.project
  ALTER COLUMN client_id    SET NOT NULL,
  ALTER COLUMN service_id   SET NOT NULL,
  ALTER COLUMN lead_user_id SET NOT NULL,
  ALTER COLUMN start_date   SET NOT NULL;

-- Restores the pre-existing state exactly. Note that these two
-- defaults are a latent bug, not something worth keeping: an insert
-- that omits client_id gets a random UUID that then fails
-- project_client_id_fkey with a misleading error. Delete these two
-- lines if you would rather leave the defaults off.
ALTER TABLE public.project
  ALTER COLUMN client_id  SET DEFAULT gen_random_uuid(),
  ALTER COLUMN service_id SET DEFAULT gen_random_uuid();

-- ---- 6. Remove the backup taken during the import ----------
DROP TABLE IF EXISTS public.projects_backup_20260730;

-- ---- Verify ------------------------------------------------
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.project;
  RAISE NOTICE 'public.project now has % rows (expected 3)', n;
END $$;

COMMIT;
