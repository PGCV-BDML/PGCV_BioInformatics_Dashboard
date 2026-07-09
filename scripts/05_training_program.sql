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
  constraint training_program_instructor_id_fkey foreign KEY (instructor_id) references users (id),
  constraint training_program_date_range_chk check (
    (
      (end_date is null)
      or (start_date is null)
      or (end_date > start_date)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_training_program_instructor_id on public.training_program using btree (instructor_id) TABLESPACE pg_default;