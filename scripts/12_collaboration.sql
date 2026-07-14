-- Table: public.collaboration
create table public.collaboration (
  id uuid not null default gen_random_uuid (),
  partner_org text not null,
  lead_user_id uuid not null,
  start_date date null,
  status public.collab_status not null,
  documents text[] null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  repository_link text null,
  constraint collaboration_pkey primary key (id),
  constraint collaboration_lead_user_id_fkey foreign KEY (lead_user_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_collaboration_lead_user_id on public.collaboration using btree (lead_user_id) TABLESPACE pg_default;