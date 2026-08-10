-- ============================================================
-- 20260810140000_training_program_cascade_delete.sql
--
-- Allow permanent removal of a training/internship program and
-- its owned rows (sessions, modules, assessments, etc.).
-- ============================================================

ALTER TABLE public.assessment
  DROP CONSTRAINT IF EXISTS assessment_program_id_fkey;

ALTER TABLE public.assessment
  ADD CONSTRAINT assessment_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.training_program(id) ON DELETE CASCADE;

ALTER TABLE public.assessment_response
  DROP CONSTRAINT IF EXISTS assessment_response_assessment_id_fkey;

ALTER TABLE public.assessment_response
  ADD CONSTRAINT assessment_response_assessment_id_fkey
  FOREIGN KEY (assessment_id) REFERENCES public.assessment(id) ON DELETE CASCADE;

ALTER TABLE public.certificate
  DROP CONSTRAINT IF EXISTS certificate_program_id_fkey;

ALTER TABLE public.certificate
  ADD CONSTRAINT certificate_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.training_program(id) ON DELETE CASCADE;

ALTER TABLE public.module
  DROP CONSTRAINT IF EXISTS module_program_id_fkey;

ALTER TABLE public.module
  ADD CONSTRAINT module_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.training_program(id) ON DELETE CASCADE;

ALTER TABLE public.onboarding_document
  DROP CONSTRAINT IF EXISTS onboarding_document_program_id_fkey;

ALTER TABLE public.onboarding_document
  ADD CONSTRAINT onboarding_document_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.training_program(id) ON DELETE CASCADE;

ALTER TABLE public.training_session
  DROP CONSTRAINT IF EXISTS training_session_program_id_fkey;

ALTER TABLE public.training_session
  ADD CONSTRAINT training_session_program_id_fkey
  FOREIGN KEY (program_id) REFERENCES public.training_program(id) ON DELETE CASCADE;
