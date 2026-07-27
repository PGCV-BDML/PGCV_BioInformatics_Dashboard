ALTER TABLE public.client
ADD COLUMN IF NOT EXISTS project_id text NULL,
ADD COLUMN IF NOT EXISTS email_address text NULL,
ADD COLUMN IF NOT EXISTS sex text NULL,
ADD COLUMN IF NOT EXISTS mobile_number text NULL,
ADD COLUMN IF NOT EXISTS affiliation_address text NULL,
ADD COLUMN IF NOT EXISTS designation text NULL;
