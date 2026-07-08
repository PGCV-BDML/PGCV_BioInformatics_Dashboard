-- Table: public.client
create table public.client (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  affiliation text not null,
  contact_info text not null,
  notes text null,
  updated_at timestamp with time zone null default now(),
  constraint client_pkey primary key (id)
) TABLESPACE pg_default;
