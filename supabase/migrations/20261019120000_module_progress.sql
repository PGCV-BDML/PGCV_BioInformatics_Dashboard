-- ============================================================
-- module_progress: checklist progress reported by library modules
-- - One row per learner × modules.json id × checklist item
--   (first user: the NFDI Oct 2026 Software Setup module)
-- - Learners write their own rows through the hidden /module-bridge page,
--   using their own session; staff read everyone's
-- - Not audited: rows change every time a learner edits pasted output
-- ============================================================

CREATE TABLE IF NOT EXISTS public.module_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  item_id text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  evidence text NULL,
  platform text NULL,
  completed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT module_progress_pkey PRIMARY KEY (id),
  CONSTRAINT module_progress_user_module_item_uidx UNIQUE (user_id, module_id, item_id),
  CONSTRAINT module_progress_module_id_format CHECK (module_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  CONSTRAINT module_progress_item_id_format CHECK (item_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  CONSTRAINT module_progress_evidence_length CHECK (evidence IS NULL OR char_length(evidence) <= 4000),
  CONSTRAINT module_progress_platform_valid CHECK (platform IS NULL OR platform IN ('windows', 'macos', 'linux'))
);

CREATE INDEX IF NOT EXISTS idx_module_progress_module_id
  ON public.module_progress (module_id);

ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS module_progress_set_updated_at ON public.module_progress;
CREATE TRIGGER module_progress_set_updated_at
  BEFORE UPDATE ON public.module_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ===== policies =====
DROP POLICY IF EXISTS "module_progress select" ON public.module_progress;
CREATE POLICY "module_progress select"
  ON public.module_progress FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
  );

DROP POLICY IF EXISTS "module_progress insert own" ON public.module_progress;
CREATE POLICY "module_progress insert own"
  ON public.module_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "module_progress update own" ON public.module_progress;
CREATE POLICY "module_progress update own"
  ON public.module_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "module_progress delete team_lead" ON public.module_progress;
CREATE POLICY "module_progress delete team_lead"
  ON public.module_progress FOR DELETE TO authenticated
  USING (get_user_role() = 'team_lead'::text);

COMMENT ON TABLE public.module_progress IS
  'Checklist progress reported by library modules via /module-bridge. module_id is the bioinfo-modules modules.json id; item_id is one of that module''s checklist ids.';
