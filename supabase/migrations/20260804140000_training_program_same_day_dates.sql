-- Allow one-day training programs where start_date equals end_date.
-- Previously training_program_date_range_chk required end_date > start_date.

ALTER TABLE public.training_program
  DROP CONSTRAINT IF EXISTS training_program_date_range_chk;

ALTER TABLE public.training_program
  ADD CONSTRAINT training_program_date_range_chk CHECK (
    (end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)
  );
