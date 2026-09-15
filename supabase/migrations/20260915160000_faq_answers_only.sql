-- Comments belong on answers, not on the question itself.
-- Closed questions still reject new answers, but answer comments stay on.

CREATE OR REPLACE FUNCTION public.faq_post_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_parent_kind text;
  v_parent_thread uuid;
  v_parent_deleted timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.thread_id := OLD.thread_id;
    NEW.author_id := OLD.author_id;
    NEW.parent_id := OLD.parent_id;
    NEW.kind := OLD.kind;
    NEW.created_at := OLD.created_at;
  END IF;

  IF NEW.kind = 'comment' AND char_length(NEW.body) > 2000 THEN
    RAISE EXCEPTION 'Comments must be 2000 characters or fewer'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.kind = 'comment' AND NEW.parent_id IS NULL THEN
    RAISE EXCEPTION 'Comments may only reply to an answer'
      USING ERRCODE = '23514';
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

  IF NEW.kind = 'comment' AND NEW.parent_id IS NOT NULL THEN
    SELECT kind, thread_id, deleted_at
      INTO v_parent_kind, v_parent_thread, v_parent_deleted
    FROM public.faq_post
    WHERE id = NEW.parent_id;

    IF v_parent_kind IS DISTINCT FROM 'answer'
      OR v_parent_thread IS DISTINCT FROM NEW.thread_id
      OR v_parent_deleted IS NOT NULL
    THEN
      RAISE EXCEPTION 'Comments may only reply to an answer on the same question'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
