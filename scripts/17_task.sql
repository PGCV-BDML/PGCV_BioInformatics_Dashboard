-- Table: public.task
create table public.task (
  id uuid not null default gen_random_uuid (),
  title text null,
  assignee_id uuid not null,
  due_date date null,
  status public.task_status not null,
  priority public.task_priority not null,
  linked_project_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint task_pkey primary key (id),
  constraint task_assignee_id_fkey foreign KEY (assignee_id) references users (id),
  constraint task_linked_project_id_fkey foreign KEY (linked_project_id) references project (id)
) TABLESPACE pg_default;

create index IF not exists idx_task_assignee_id on public.task using btree (assignee_id) TABLESPACE pg_default;

create index IF not exists idx_task_linked_project_id on public.task using btree (linked_project_id) TABLESPACE pg_default;