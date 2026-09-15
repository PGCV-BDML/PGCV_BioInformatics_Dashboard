-- FAQ board is question + answers only. Reject new comment posts.

CREATE OR REPLACE FUNCTION public.faq_post_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.thread_id := OLD.thread_id;
    NEW.author_id := OLD.author_id;
    NEW.parent_id := OLD.parent_id;
    NEW.kind := OLD.kind;
    NEW.created_at := OLD.created_at;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.kind = 'comment' THEN
    RAISE EXCEPTION 'FAQ comments are not supported'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.kind = 'answer' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Answers cannot reply to another post'
        USING ERRCODE = '23514';
    END IF;

    SELECT status INTO v_status
    FROM public.faq_thread
    WHERE id = NEW.thread_id;

    IF v_status IS DISTINCT FROM 'open' THEN
      RAISE EXCEPTION 'Closed questions do not accept new answers'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
