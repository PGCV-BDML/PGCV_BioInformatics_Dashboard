-- Table: public.certificate
create table public.certificate (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  participant_id uuid not null,
  issued_at timestamp with time zone null,
  pdf_link text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint certificate_pkey primary key (id),
  constraint certificate_participant_id_fkey foreign KEY (participant_id) references "user" (id),
  constraint certificate_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;
