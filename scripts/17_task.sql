-- Table: public.task
create table public.task (
  id uuid not null default gen_random_uuid (),
  title text null,
  assignee_id uuid not null,
  due_date date null,
  status public.task_status not null,
  priority public.task_priority not null,
  linked_project_id uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint task_pkey primary key (id),
  constraint task_assignee_id_fkey foreign KEY (assignee_id) references "user" (id),
  constraint task_linked_project_id_fkey foreign KEY (linked_project_id) references project (id)
) TABLESPACE pg_default;
