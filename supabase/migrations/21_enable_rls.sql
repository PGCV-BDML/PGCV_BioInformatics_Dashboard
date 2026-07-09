-- ============================================================
-- 21_enable_rls.sql
-- Enable Row Level Security on all 18 public tables.
-- Mirrors the live Supabase state: RLS ON for every table.
-- ============================================================

ALTER TABLE public.users                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_template           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_program            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_response         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_document         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_report              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session            ENABLE ROW LEVEL SECURITY;
