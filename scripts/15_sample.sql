-- Table: public.sample
create table public.sample (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  identifier text not null,
  metadata jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint sample_pkey primary key (id),
  constraint sample_project_id_fkey foreign KEY (project_id) references project (id)
) TABLESPACE pg_default;

create index IF not exists idx_sample_project_id on public.sample using btree (project_id) TABLESPACE pg_default;