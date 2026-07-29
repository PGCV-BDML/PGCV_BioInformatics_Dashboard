-- Profile fields for staff team directory

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS designation text NULL;
