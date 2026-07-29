-- Requesting institution for training / internship programs.

ALTER TABLE public.training_program
    ADD COLUMN IF NOT EXISTS requesting_institution text;
