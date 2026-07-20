-- ============================================================
-- 19_initial_schema.sql
-- Consolidated initial schema: enums + 18 tables + indexes
-- Mirrors the live Supabase database (post-12-migration state).
-- Apply this only to a fresh database.
-- ============================================================

-- ===== Custom ENUM types =====

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
    'submitted',
    'on_hold',
    'completed'
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
    'user_login',
    'user_logout'
);

CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'on_hold'
);

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high'
);

-- ===== ID Generator Functions =====

CREATE OR REPLACE FUNCTION public.generate_client_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  yr       int := extract(year from now());
  next_val int;
begin
  perform pg_advisory_xact_lock(yr);
  select coalesce(max(
           substring(client_id from 'CL-\d{4}-(\d+)')::int
         ), 0) + 1
  into next_val
  from public.client
  where client_id like 'CL-' || yr || '-%';
  return 'CL-' || yr || '-' || lpad(next_val::text, 3, '0');
end;
$$;

CREATE OR REPLACE FUNCTION public.generate_project_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  yr       int := extract(year from now());
  next_val int;
begin
  perform pg_advisory_xact_lock(yr);
  select coalesce(max(
           substring(project_id from 'P-\d{4}-(\d+)')::int
         ), 0) + 1
  into next_val
  from public.project
  where project_id like 'P-' || yr || '-%';
  return 'P-' || yr || '-' || lpad(next_val::text, 3, '0');
end;
$$;

-- ===== Tables =====

-- Table: users
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    email text NOT NULL DEFAULT (auth.jwt() ->> 'email'::text),
    role public.user_roles NOT NULL DEFAULT 'none'::user_roles,
    track_assignment text NULL,
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT user_pkey PRIMARY KEY (id)
);

-- Table: client
CREATE TABLE public.client (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id text NOT NULL DEFAULT generate_client_id(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    affiliation text NOT NULL,
    contact_info text NOT NULL,
    notes text NULL,
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT client_pkey PRIMARY KEY (id)
);

-- Table: service
CREATE TABLE public.service (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    category public.service_categories NOT NULL,
    pipeline_default text NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT service_pkey PRIMARY KEY (id)
);

-- Table: document_template
CREATE TABLE public.document_template (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    category public.template_categories NULL,
    title text NULL,
    template_link text NULL,
    version text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT document_template_pkey PRIMARY KEY (id)
);

-- Table: training_program
CREATE TABLE public.training_program (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    type public.training_type NULL,
    start_date date NULL,
    end_date date NULL,
    instructor_id uuid NOT NULL,
    description text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT training_program_pkey PRIMARY KEY (id),
    CONSTRAINT training_program_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES users(id),
    CONSTRAINT training_program_date_range_chk CHECK (
        ((end_date IS NULL) OR (start_date IS NULL) OR (end_date > start_date))
    )
);
CREATE INDEX IF NOT EXISTS idx_training_program_instructor_id ON public.training_program USING btree (instructor_id);

-- Table: project
CREATE TABLE public.project (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id text NOT NULL DEFAULT generate_project_id(),
    name text NOT NULL,
    client_id uuid NOT NULL,
    service_id uuid NOT NULL,
    status public.project_status NOT NULL,
    lead_user_id uuid NOT NULL,
    start_date date NOT NULL,
    target_delivery_date date NULL,
    actual_delivery_date date NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    repository_link text NULL,
    CONSTRAINT project_pkey PRIMARY KEY (id),
    CONSTRAINT project_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(id),
    CONSTRAINT project_lead_user_id_fkey FOREIGN KEY (lead_user_id) REFERENCES users(id),
    CONSTRAINT project_service_id_fkey FOREIGN KEY (service_id) REFERENCES service(id),
    CONSTRAINT project_delivery_date_chk CHECK (
        ((actual_delivery_date IS NULL) OR (start_date IS NULL) OR (actual_delivery_date >= start_date))
    )
);
CREATE INDEX IF NOT EXISTS idx_project_client_id ON public.project USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_project_service_id ON public.project USING btree (service_id);
CREATE INDEX IF NOT EXISTS idx_project_lead_user_id ON public.project USING btree (lead_user_id);

-- Table: analysis
CREATE TABLE public.analysis (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    pipeline text NULL,
    pipeline_version text NULL,
    status public.analysis_status NOT NULL,
    assignee_id uuid NOT NULL,
    started_at timestamp with time zone NULL,
    completed_at timestamp with time zone NULL,
    output_link text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT analysis_pkey PRIMARY KEY (id),
    CONSTRAINT analysis_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id),
    CONSTRAINT analysis_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id)
);
CREATE INDEX IF NOT EXISTS idx_analysis_project_id ON public.analysis USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_assignee_id ON public.analysis USING btree (assignee_id);

-- Table: assessment
CREATE TABLE public.assessment (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL,
    type public.assessment_type NOT NULL,
    questions jsonb NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT assessment_pkey PRIMARY KEY (id),
    CONSTRAINT assessment_program_id_fkey FOREIGN KEY (program_id) REFERENCES training_program(id)
);
CREATE INDEX IF NOT EXISTS idx_assessment_program_id ON public.assessment USING btree (program_id);

-- Table: assessment_response
CREATE TABLE public.assessment_response (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    answers jsonb NULL,
    score smallint NULL,
    submitted_at timestamp with time zone NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT assessmentResponse_pkey PRIMARY KEY (id),
    CONSTRAINT assessment_response_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessment(id),
    CONSTRAINT assessment_response_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES users(id),
    CONSTRAINT assessment_response_score_nonneg_chk CHECK (
        ((score IS NULL) OR (score >= 0))
    )
);
CREATE INDEX IF NOT EXISTS idx_assessment_response_assessment_id ON public.assessment_response USING btree (assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_response_participant_id ON public.assessment_response USING btree (participant_id);

-- Table: audit_log
CREATE TABLE public.audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    timestamp timestamp with time zone NULL DEFAULT now(),
    user_id uuid NULL,
    action public.audit_log_action NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    details jsonb NULL,
    CONSTRAINT auditLog_pkey PRIMARY KEY (id),
    CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log USING btree (user_id);

-- Table: certificate
CREATE TABLE public.certificate (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    issued_at timestamp with time zone NULL,
    pdf_link text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT certificate_pkey PRIMARY KEY (id),
    CONSTRAINT certificate_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES users(id),
    CONSTRAINT certificate_program_id_fkey FOREIGN KEY (program_id) REFERENCES training_program(id)
);
CREATE INDEX IF NOT EXISTS idx_certificate_program_id ON public.certificate USING btree (program_id);
CREATE INDEX IF NOT EXISTS idx_certificate_participant_id ON public.certificate USING btree (participant_id);

-- Table: collaboration
CREATE TABLE public.collaboration (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    partner_org text NOT NULL,
    lead_user_id uuid NOT NULL,
    start_date date NULL,
    status public.collab_status NOT NULL,
    documents text[] NULL,
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    repository_link text NULL,
    CONSTRAINT collaboration_pkey PRIMARY KEY (id),
    CONSTRAINT collaboration_lead_user_id_fkey FOREIGN KEY (lead_user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_collaboration_lead_user_id ON public.collaboration USING btree (lead_user_id);

-- Table: module
CREATE TABLE public.module (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL,
    title text NULL,
    html_content_link text NULL,
    "order" integer NULL,
    save_log_enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT module_pkey PRIMARY KEY (id),
    CONSTRAINT module_program_id_order_key UNIQUE (program_id, "order"),
    CONSTRAINT module_program_id_fkey FOREIGN KEY (program_id) REFERENCES training_program(id)
);

-- Table: onboarding_document
CREATE TABLE public.onboarding_document (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL,
    title text NULL,
    link text NULL,
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT onboarding_document_pkey PRIMARY KEY (id),
    CONSTRAINT onboarding_document_program_id_fkey FOREIGN KEY (program_id) REFERENCES training_program(id)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_document_program_id ON public.onboarding_document USING btree (program_id);

-- Table: sample
CREATE TABLE public.sample (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    identifier text NOT NULL,
    metadata jsonb NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT sample_pkey PRIMARY KEY (id),
    CONSTRAINT sample_project_id_fkey FOREIGN KEY (project_id) REFERENCES project(id)
);
CREATE INDEX IF NOT EXISTS idx_sample_project_id ON public.sample USING btree (project_id);

-- Table: service_report
CREATE TABLE public.service_report (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    analysis_id uuid NOT NULL,
    report_link text NULL,
    delivered_at timestamp with time zone NULL,
    delivered_by uuid NOT NULL,
    client_acknowledged_at timestamp with time zone NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT service_report_pkey PRIMARY KEY (id),
    CONSTRAINT service_report_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES analysis(id),
    CONSTRAINT service_report_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_service_report_analysis_id ON public.service_report USING btree (analysis_id);
CREATE INDEX IF NOT EXISTS idx_service_report_delivered_by ON public.service_report USING btree (delivered_by);

-- Table: task
CREATE TABLE public.task (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NULL,
    assignee_id uuid NOT NULL,
    due_date date NULL,
    status public.task_status NOT NULL,
    priority text NOT NULL,
    linked_project_id uuid NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT task_pkey PRIMARY KEY (id),
    CONSTRAINT task_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id),
    CONSTRAINT task_linked_project_id_fkey FOREIGN KEY (linked_project_id) REFERENCES project(id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignee_id ON public.task USING btree (assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_linked_project_id ON public.task USING btree (linked_project_id);

-- Table: training_session
CREATE TABLE public.training_session (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL,
    date date NULL,
    title text NULL,
    module_link text NULL,
    attendance_required boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT training_session_pkey PRIMARY KEY (id),
    CONSTRAINT training_session_program_id_fkey FOREIGN KEY (program_id) REFERENCES training_program(id)
);
CREATE INDEX IF NOT EXISTS idx_training_session_program_id ON public.training_session USING btree (program_id);
