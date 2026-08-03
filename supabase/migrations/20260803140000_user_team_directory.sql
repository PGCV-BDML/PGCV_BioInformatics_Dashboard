-- Opt-in flag for the bioinformatics Team module + calendar absences.
-- Not every team_member account belongs to the BDML roster (e.g. collaborators
-- from other units who still need dashboard access).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS in_team_directory boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.in_team_directory IS
  'When true, user appears on Team presence and calendar absences.';

-- Preserve current roster: existing staff stay visible until a lead opts them out.
UPDATE public.users
SET in_team_directory = true
WHERE role IN ('team_lead', 'team_member');

CREATE INDEX IF NOT EXISTS idx_users_in_team_directory
  ON public.users USING btree (in_team_directory)
  WHERE in_team_directory = true;
