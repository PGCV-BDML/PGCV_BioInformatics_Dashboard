-- Trigger function: insert a notification when an analysis is "ready for review"
-- Condition: status = 'completed' AND service_report_link IS NOT NULL AND approver_user_id IS NOT NULL
-- Fires on all three fields so the notification appears as soon as the LAST piece is filled in.
-- Deduplicates: does not insert if an unread notification for this analysis already exists.

CREATE OR REPLACE FUNCTION public.notify_approving_officer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ready_now  boolean;
  v_ready_before boolean;
  v_existing   uuid;
BEGIN
  v_ready_now :=
    NEW.status = 'completed'
    AND NEW.service_report_link IS NOT NULL
    AND trim(NEW.service_report_link) <> ''
    AND NEW.approver_user_id IS NOT NULL;

  v_ready_before :=
    OLD.status = 'completed'
    AND OLD.service_report_link IS NOT NULL
    AND trim(OLD.service_report_link) <> ''
    AND OLD.approver_user_id IS NOT NULL;

  -- Only act when the record just became "ready" (edge trigger, not level)
  IF v_ready_now AND NOT v_ready_before THEN
    -- Deduplicate: skip if an unread notification already exists for this analysis
    SELECT id INTO v_existing
    FROM public.notifications
    WHERE type = 'analysis_ready_for_review'
      AND (payload->>'analysis_id') = NEW.id::text
      AND is_read = false
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES (
        'analysis_ready_for_review',
        jsonb_build_object(
          'analysis_id',          NEW.id,
          'client_name',          NEW.client_name,
          'service_report_number', NEW.service_report_number,
          'service_report_link',  NEW.service_report_link
        ),
        NEW.approver_user_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_notify_on_completion ON public.analysis;
CREATE TRIGGER analysis_notify_on_completion
  AFTER UPDATE ON public.analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_approving_officer();
