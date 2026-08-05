-- ============================================================
-- 20260805140000_notifications_delete_policy.sql
-- Lets people clear their own notifications once they have dealt
-- with them.
--
-- The `is_read` condition is the guard that matters: a notification
-- can only be deleted after it has been acted on or dismissed, so an
-- unread approval request can't be thrown away before anyone sees it.
-- ============================================================

DROP POLICY IF EXISTS "notifications delete own read" ON public.notifications;
CREATE POLICY "notifications delete own read"
  ON public.notifications FOR DELETE TO authenticated
  USING (target_user_id = auth.uid() AND is_read = true);
