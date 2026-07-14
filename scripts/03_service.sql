-- Table: public.service
create table public.service (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  category public.service_categories not null,
  pipeline_default text null,
  active boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint service_pkey primary key (id)
) TABLESPACE pg_default;