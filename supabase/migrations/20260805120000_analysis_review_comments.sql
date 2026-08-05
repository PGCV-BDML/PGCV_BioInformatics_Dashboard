-- ============================================================
-- 20260805120000_analysis_review_comments.sql
-- Review comments left by an approving officer when a service
-- report needs changes before it can be approved.
--
-- Comments live on their own table rather than in analysis.notes
-- because a report can go through several review rounds, and
-- because notifications are RLS-scoped per user — a comment kept
-- only in a notification payload would be invisible to the other
-- side of the conversation.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analysis_review_comment (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id  uuid        NOT NULL REFERENCES public.analysis(id) ON DELETE CASCADE,
  author_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body         text        NOT NULL,
  resolved_at  timestamptz NULL,
  resolved_by  uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_review_comment_body_not_blank CHECK (btrim(body) <> '')
);

CREATE INDEX IF NOT EXISTS idx_analysis_review_comment_analysis_id
  ON public.analysis_review_comment (analysis_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_review_comment_open
  ON public.analysis_review_comment (analysis_id)
  WHERE resolved_at IS NULL;

-- RLS: same staff-only access as the analysis rows these hang off.
ALTER TABLE public.analysis_review_comment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analysis_review_comment is fully accessible to staff"
  ON public.analysis_review_comment;
CREATE POLICY "analysis_review_comment is fully accessible to staff"
  ON public.analysis_review_comment FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));
