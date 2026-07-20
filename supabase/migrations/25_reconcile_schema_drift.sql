-- ============================================================
-- 25_reconcile_schema_drift.sql
-- Idempotent migration that reconciles drift between the
-- original 19_initial_schema.sql and the live Supabase DB.
--
-- NOTE: Old enum values (to_do/ongoing/finished for task_status,
-- critical for task_priority) cannot be removed (PostgreSQL
-- limitation) and remain as unused values in the type.
-- ============================================================

-- ===== Enum: project_status (add missing values) =====
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'completed';

-- ===== Enum: task_status (add new values, replacing old set) =====
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'on_hold';
-- Old values 'to_do', 'ongoing', 'finished' remain as unused enum
-- values (PostgreSQL does not allow removing enum values).

-- ===== Task priority column: change from enum to text =====
ALTER TABLE public.task ALTER COLUMN priority TYPE text USING priority::text;

-- ===== Users role: add default =====
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'none'::user_roles;

-- ===== ID Generator Functions =====

CREATE OR REPLACE FUNCTION public.generate_client_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  yr       int := extract(year from now());
  next_val int;
begin
  perform pg_advisory_xact_lock(yr);
  select coalesce(max(
           substring(client_id from 'CL-\d{4}-(\d+)')::int
         ), 0) + 1
  into next_val
  from public.client
  where client_id like 'CL-' || yr || '-%';
  return 'CL-' || yr || '-' || lpad(next_val::text, 3, '0');
end;
$$;

CREATE OR REPLACE FUNCTION public.generate_project_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  yr       int := extract(year from now());
  next_val int;
begin
  perform pg_advisory_xact_lock(yr);
  select coalesce(max(
           substring(project_id from 'P-\d{4}-(\d+)')::int
         ), 0) + 1
  into next_val
  from public.project
  where project_id like 'P-' || yr || '-%';
  return 'P-' || yr || '-' || lpad(next_val::text, 3, '0');
end;
$$;

-- ===== Add generated ID columns to client and project =====
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT generate_client_id();
ALTER TABLE public.project ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT generate_project_id();
