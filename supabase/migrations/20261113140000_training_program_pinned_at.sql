-- Team-wide pins for the Training and Internship directories.
-- A pinned program is listed first for everyone, most recently pinned on
-- top. Staff pin and unpin through the existing "training_program update
-- staff" policy, so no new policy is needed. Safe to run more than once.

ALTER TABLE public.training_program
    ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone NULL;

COMMENT ON COLUMN public.training_program.pinned_at IS
  'When staff pinned this program to the top of its directory; NULL when not pinned.';
