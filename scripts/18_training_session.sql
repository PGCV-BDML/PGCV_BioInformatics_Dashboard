-- Table: public.training_session
create table public.training_session (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  date date null,
  title text null,
  module_link text null,
  attendance_required boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint training_session_pkey primary key (id),
  constraint training_session_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;
