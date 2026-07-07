-- Table: public.training_program
create table public.training_program (
  id uuid not null default gen_random_uuid (),
  title text not null,
  type public.training_type null,
  start_date date null,
  end_date date null,
  instructor_id uuid not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint training_program_pkey primary key (id),
  constraint training_program_instructor_id_fkey foreign KEY (instructor_id) references "user" (id)
) TABLESPACE pg_default;
