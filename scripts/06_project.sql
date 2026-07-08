-- Table: public.project
create table public.project (
  id uuid not null default gen_random_uuid (),
  name text not null,
  client_id uuid not null,
  service_id uuid not null,
  status public.project_status not null,
  lead_user_id uuid not null,
  start_date date not null,
  target_delivery_date date null,
  actual_delivery_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint project_pkey primary key (id),
  constraint project_client_id_fkey foreign KEY (client_id) references client (id),
  constraint project_lead_user_id_fkey foreign KEY (lead_user_id) references "user" (id),
  constraint project_service_id_fkey foreign KEY (service_id) references service (id)
) TABLESPACE pg_default;
