-- Add approver_user_id to analysis (nullable; assigned later)
ALTER TABLE public.analysis
  ADD COLUMN IF NOT EXISTS approver_user_id uuid NULL
  REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_approver_user_id
  ON public.analysis (approver_user_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  target_user_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_read         boolean     NOT NULL DEFAULT false,
  email_sent_at   timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id
  ON public.notifications (target_user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (target_user_id, is_read)
  WHERE is_read = false;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
DROP POLICY IF EXISTS "notifications select own" ON public.notifications;
CREATE POLICY "notifications select own"
  ON public.notifications FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

-- Users can update (mark read) their own notifications
DROP POLICY IF EXISTS "notifications update own" ON public.notifications;
CREATE POLICY "notifications update own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid());

-- Only the server-side trigger (SECURITY DEFINER) inserts; no direct client insert
DROP POLICY IF EXISTS "notifications no direct insert" ON public.notifications;
CREATE POLICY "notifications no direct insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (false);
