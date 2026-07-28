-- Add lifecycle status for training / internship programs.
-- Soft archive via status='archived'; no hard-delete UI.

CREATE TYPE public.training_program_status AS ENUM (
    'draft',
    'ongoing',
    'completed',
    'archived'
);

ALTER TABLE public.training_program
    ADD COLUMN IF NOT EXISTS status public.training_program_status NOT NULL DEFAULT 'ongoing';

CREATE INDEX IF NOT EXISTS idx_training_program_status
    ON public.training_program USING btree (status);
