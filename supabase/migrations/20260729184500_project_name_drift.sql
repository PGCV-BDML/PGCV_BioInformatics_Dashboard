-- Reconcile missing project.name (schema drift vs 19_initial_schema / app types).
-- Tasks + Calendar failed with: column project.name does not exist
-- when calling getNameIdFromDB("project") → select("id,name").

ALTER TABLE public.project
  ADD COLUMN IF NOT EXISTS name text NULL;

-- Prefer existing generated codes as a readable label until users rename them.
UPDATE public.project
SET name = project_id
WHERE (name IS NULL OR btrim(name) = '')
  AND project_id IS NOT NULL;
