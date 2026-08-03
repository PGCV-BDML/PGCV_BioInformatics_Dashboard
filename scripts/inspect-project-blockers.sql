-- Why won't a project delete?
--
-- Three tables reference project(id) with no ON DELETE action, so
-- Postgres refuses the delete while any of them still have rows:
--   analysis.project_id      (NOT NULL)
--   sample.project_id        (NOT NULL)
--   task.linked_project_id   (nullable)
--
-- Run this in the Supabase SQL Editor. It only reads.

-- ---- 1. Every project, with what is holding it ---------------
-- Anything with 0/0/0 in the three count columns will delete cleanly.
--
-- The counts live in a CTE because ORDER BY can only reference an
-- output alias bare, not inside an expression such as a + b + c.
WITH blockers AS (
  SELECT
    p.project_id,
    p.name,
    p.status,
    (SELECT count(*) FROM public.analysis a WHERE a.project_id = p.id)    AS analyses,
    (SELECT count(*) FROM public.sample s   WHERE s.project_id = p.id)    AS samples,
    (SELECT count(*) FROM public.task t WHERE t.linked_project_id = p.id) AS tasks
  FROM public.project p
)
SELECT *
FROM blockers
ORDER BY analyses + samples + tasks DESC, project_id;

-- ---- 2. Every sample that is blocking a project --------------
-- Shows the full metadata blob, not just the name: a placeholder
-- row and a real specimen record look very different there.
SELECT
  p.project_id,
  p.name AS project_name,
  s.identifier,
  s.metadata->>'sample_name' AS sample_name,
  s.metadata,
  s.created_at
FROM public.sample s
JOIN public.project p ON p.id = s.project_id
ORDER BY p.project_id, s.created_at;

-- ---- 3. Remove the demo samples ------------------------------
-- The S-001/S-002/S-003 rows come from section 8 of
-- 20260720000000_seed_demo_data.sql. That seed does
-- `SELECT id INTO p1 FROM public.project ORDER BY created_at LIMIT 1`,
-- so it attached fake specimens to the three oldest REAL projects
-- rather than creating projects of its own. The projects are worth
-- keeping; these samples are not.
--
-- Pinned to the seed's insert timestamp as well as the identifier,
-- so a genuine sample numbered S-001 later can never be caught by
-- this. Preview before deleting:

-- SELECT p.project_id, s.identifier, s.metadata
-- FROM public.sample s
-- JOIN public.project p ON p.id = s.project_id
-- WHERE s.identifier IN ('S-001', 'S-002', 'S-003')
--   AND s.created_at = '2026-07-19 14:20:51.392528+00';

BEGIN;

DELETE FROM public.sample
WHERE identifier IN ('S-001', 'S-002', 'S-003')
  AND created_at = '2026-07-19 14:20:51.392528+00';

COMMIT;

-- Then delete the project you wanted from the dashboard UI as
-- normal. Re-run section 1 to confirm every count is now 0.
