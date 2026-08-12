-- Training code for training programs (optional catalog / cohort code).

ALTER TABLE public.training_program
    ADD COLUMN IF NOT EXISTS training_code text;
