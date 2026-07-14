-- Table: public.onboarding_document
create table public.onboarding_document (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  title text null,
  link text null,
  is_required boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint onboarding_document_pkey primary key (id),
  constraint onboarding_document_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;

create index IF not exists idx_onboarding_document_program_id on public.onboarding_document using btree (program_id) TABLESPACE pg_default;