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
  constraint assessment_response_participant_id_fkey foreign KEY (participant_id) references users (id),
  constraint assessment_response_score_nonneg_chk check (
    (
      (score is null)
      or (score >= 0)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_assessment_response_assessment_id on public.assessment_response using btree (assessment_id) TABLESPACE pg_default;

create index IF not exists idx_assessment_response_participant_id on public.assessment_response using btree (participant_id) TABLESPACE pg_default;