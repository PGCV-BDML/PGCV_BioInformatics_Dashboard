-- Table: public.service_report
create table public.service_report (
  id uuid not null default gen_random_uuid (),
  analysis_id uuid not null,
  report_link text null,
  delivered_at timestamp with time zone null,
  delivered_by uuid not null,
  client_acknowledged_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint service_report_pkey primary key (id),
  constraint service_report_analysis_id_fkey foreign KEY (analysis_id) references analysis (id),
  constraint service_report_delivered_by_fkey foreign KEY (delivered_by) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_service_report_analysis_id on public.service_report using btree (analysis_id) TABLESPACE pg_default;

create index IF not exists idx_service_report_delivered_by on public.service_report using btree (delivered_by) TABLESPACE pg_default;
