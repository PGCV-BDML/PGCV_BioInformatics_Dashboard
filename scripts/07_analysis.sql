-- Table: public.analysis
create table public.analysis (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  pipeline text null,
  pipeline_version text null,
  status public.analysis_status not null,
  assignee_id uuid not null,
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  output_link text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint analysis_pkey primary key (id),
  constraint analysis_assignee_id_fkey foreign KEY (assignee_id) references "user" (id),
  constraint analysis_project_id_fkey foreign KEY (project_id) references project (id)
) TABLESPACE pg_default;
