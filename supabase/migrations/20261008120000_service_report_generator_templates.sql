-- Staff-added templates for the Service Report Generator launchpad.
-- Rows with a title are custom cards created from the dashboard; rows
-- without one only store the live address of a built-in catalog card.

ALTER TABLE public.service_report_generator
  ADD COLUMN IF NOT EXISTS title text NULL,
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS icon text NULL,
  ADD COLUMN IF NOT EXISTS accent text NULL,
  ADD COLUMN IF NOT EXISTS share_host boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NULL DEFAULT now();

ALTER TABLE public.service_report_generator
  DROP CONSTRAINT IF EXISTS service_report_generator_accent_check;
ALTER TABLE public.service_report_generator
  ADD CONSTRAINT service_report_generator_accent_check
  CHECK (accent IS NULL OR accent ~ '^#[0-9a-fA-F]{6}$');
