-- ============================================================
-- MASTER SCRIPT: All Tables and ENUMS
-- Tables are created in dependency order (referenced tables first)
-- ============================================================

-- Creating custom ENUM data types
CREATE TYPE public.user_roles AS ENUM (
    'team_lead', 
    'team_member', 
    'trainee', 
    'intern'
);

CREATE TYPE public.service_categories AS ENUM (
    'WGS', 
    'amplicon', 
    'metabarcoding', 
    'transcriptomics', 
    'shotgun_metag', 
    'phylogenetics', 
    'custom'
);

CREATE TYPE public.analysis_status AS ENUM (
    'on_hold', 
    'ongoing', 
    'submitted', 
    'for_approval', 
    'completed'
);

CREATE TYPE public.collab_status AS ENUM (
    'for_approval', 
    'ongoing', 
    'finished'
);

CREATE TYPE public.training_type AS ENUM (
    'training', 
    'internship'
);

CREATE TYPE public.assessment_type AS ENUM (
    'pre_test', 
    'post_test', 
    'evaluation'
);

CREATE TYPE public.project_status AS ENUM (
    'ongoing', 
    'for_approval', 
    'submitted'
);

CREATE TYPE public.template_categories AS ENUM (
    'collaboration_onboarding', 
    'project_onboarding', 
    'certificate', 
    'service_report'
);

CREATE TYPE public.audit_log_action AS ENUM (
    'state_change', 
    'data_deletion', 
    'role_change', 
    'data_export', 
    'data_modification', 
    'user_login'
);

CREATE TYPE public.task_status AS ENUM (
    'to_do', 
    'ongoing', 
    'finished'
);

CREATE TYPE public.task_priority AS ENUM (
    'critical', 
    'high', 
    'medium', 
    'low'
);

-- Table: public.user
create table public.user (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  email text not null default (auth.jwt () ->> 'email'::text),
  role public.user_roles not null,
  track_assignment text null,
  updated_at timestamp with time zone null default now(),
  constraint user_pkey primary key (id)
) TABLESPACE pg_default;

-- Table: public.client
create table public.client (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  affiliation text not null,
  contact_info text not null,
  notes text null,
  updated_at timestamp with time zone null default now(),
  constraint client_pkey primary key (id)
) TABLESPACE pg_default;

-- Table: public.service
create table public.service (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  category public.service_categories not null,
  pipeline_default text null,
  active boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint service_pkey primary key (id)
) TABLESPACE pg_default;

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

-- Table: public.training_program
create table public.training_program (
  id uuid not null default gen_random_uuid (),
  title text not null,
  type public.training_type null,
  start_date date null,
  end_date date null,
  instructor_id uuid not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint training_program_pkey primary key (id),
  constraint training_program_instructor_id_fkey foreign KEY (instructor_id) references "user" (id)
) TABLESPACE pg_default;

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

-- Table: public.assessment
create table public.assessment (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  type public.assessment_type not null,
  questions text[] null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint assessment_pkey primary key (id),
  constraint assessment_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;

-- Table: public.assessment_response
create table public.assessment_response (
  id uuid not null default gen_random_uuid (),
  assessment_id uuid not null,
  participant_id uuid not null,
  answers jsonb null,
  score smallint null,
  submitted_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint assessmentResponse_pkey primary key (id),
  constraint assessment_response_assessment_id_fkey foreign KEY (assessment_id) references assessment (id),
  constraint assessment_response_participant_id_fkey foreign KEY (participant_id) references "user" (id)
) TABLESPACE pg_default;

-- Table: public.audit_log
create table public.audit_log (
  id uuid not null default gen_random_uuid (),
  timestamp timestamp with time zone null default now(),
  user_id uuid not null,
  action public.audit_log_action null,
  target_type text not null,
  target_id text not null,
  details jsonb null,
  constraint auditLog_pkey primary key (id),
  constraint audit_log_user_id_fkey foreign KEY (user_id) references "user" (id)
) TABLESPACE pg_default;

-- Table: public.certificate
create table public.certificate (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  participant_id uuid not null,
  issued_at timestamp with time zone null,
  pdf_link text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint certificate_pkey primary key (id),
  constraint certificate_participant_id_fkey foreign KEY (participant_id) references "user" (id),
  constraint certificate_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;

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
  constraint collaboration_pkey primary key (id),
  constraint collaboration_lead_user_id_fkey foreign KEY (lead_user_id) references "user" (id)
) TABLESPACE pg_default;

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

-- Table: public.sample
create table public.sample (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  identifier text not null,
  metadata jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint sample_pkey primary key (id),
  constraint sample_project_id_fkey foreign KEY (project_id) references project (id)
) TABLESPACE pg_default;

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
  constraint service_report_delivered_by_fkey foreign KEY (delivered_by) references "user" (id)
) TABLESPACE pg_default;

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

-- Table: public.training_session
create table public.training_session (
  id uuid not null default gen_random_uuid (),
  program_id uuid not null,
  date date null,
  title text null,
  module_link text null,
  attendance_required boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint training_session_pkey primary key (id),
  constraint training_session_program_id_fkey foreign KEY (program_id) references training_program (id)
) TABLESPACE pg_default;

