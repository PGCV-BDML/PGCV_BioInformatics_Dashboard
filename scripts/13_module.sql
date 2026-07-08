-- Table: public.module
create table public.module (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  title text null,
  html_content_link text null,
  "order" integer null,
  save_log_enabled boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint module_pkey primary key (id),
  constraint module_program_id_order_key unique (program_id, "order"),
  constraint module_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;
