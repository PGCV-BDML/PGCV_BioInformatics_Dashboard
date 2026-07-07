-- Table: public.user
create table public.user (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  email text not null default (auth.jwt () ->> 'email'::text),
  role public.user_roles not null,
  track_assignment text null,
  updated_at timestamp with time zone null default now(),
  constraint user_pkey primary key (id)
) TABLESPACE pg_default;
