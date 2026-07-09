-- Table: public.audit_log
create table public.audit_log (
  id uuid not null default gen_random_uuid (),
  timestamp timestamp with time zone null default now(),
  user_id uuid null,
  action public.audit_log_action null,
  target_type text not null,
  target_id text not null,
  details jsonb null,
  constraint auditLog_pkey primary key (id),
  constraint audit_log_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_audit_log_user_id on public.audit_log using btree (user_id) TABLESPACE pg_default;