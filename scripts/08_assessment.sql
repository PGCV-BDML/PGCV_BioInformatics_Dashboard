-- Table: public.assessment
create table public.assessment (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  type public.assessment_type not null,
  questions jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint assessment_pkey primary key (id),
  constraint assessment_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;

create index IF not exists idx_assessment_program_id on public.assessment using btree (program_id) TABLESPACE pg_default;