-- Notify every other staff member when someone posts a new FAQ.

CREATE OR REPLACE FUNCTION public.faq_thread_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_name text;
BEGIN
  SELECT name INTO v_author_name
  FROM public.users
  WHERE id = NEW.author_id;

  INSERT INTO public.notifications (type, payload, target_user_id)
  SELECT
    'faq_question_added',
    jsonb_build_object(
      'faq_id', NEW.id,
      'title', NEW.title,
      'comment', left(btrim(NEW.body), 280),
      'comment_author', v_author_name,
      'kind', 'question'
    ),
    u.id
  FROM public.users u
  WHERE u.role::text = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND u.id IS DISTINCT FROM NEW.author_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faq_thread_notify ON public.faq_thread;
CREATE TRIGGER faq_thread_notify
  AFTER INSERT ON public.faq_thread
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_thread_notify();
