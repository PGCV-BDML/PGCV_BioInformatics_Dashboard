-- Add Events to task category tags
ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'events';
