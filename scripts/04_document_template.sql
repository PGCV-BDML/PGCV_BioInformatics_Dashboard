-- Table: public.document_template
create table public.document_template (
  id uuid not null default gen_random_uuid (),
  category public.template_categories null,
  title text null,
  template_link text null,
  version text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint document_template_pkey primary key (id)
) TABLESPACE pg_default;