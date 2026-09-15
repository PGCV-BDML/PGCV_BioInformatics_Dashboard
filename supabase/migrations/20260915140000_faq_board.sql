-- Staff Q&A board (FAQs): tagged questions, answers + comments,
-- open/closed, and notifications on replies. Closed threads reject
-- new answers but still accept comments.

CREATE TABLE IF NOT EXISTS public.faq_thread (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  author_id uuid NOT NULL,
  accepted_post_id uuid NULL,
  closed_at timestamp with time zone NULL,
  closed_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faq_thread_pkey PRIMARY KEY (id),
  CONSTRAINT faq_thread_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT faq_thread_closed_by_fkey
    FOREIGN KEY (closed_by) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT faq_thread_title_chk
    CHECK (char_length(btrim(title)) > 0 AND char_length(title) <= 200),
  CONSTRAINT faq_thread_body_chk
    CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 20000),
  CONSTRAINT faq_thread_status_chk
    CHECK (status = ANY (ARRAY['open'::text, 'closed'::text]))
);

CREATE INDEX IF NOT EXISTS idx_faq_thread_status
  ON public.faq_thread USING btree (status);

CREATE INDEX IF NOT EXISTS idx_faq_thread_author_id
  ON public.faq_thread USING btree (author_id);

CREATE INDEX IF NOT EXISTS idx_faq_thread_created_at
  ON public.faq_thread USING btree (created_at DESC);

CREATE TABLE IF NOT EXISTS public.faq_tag (
  thread_id uuid NOT NULL,
  tag text NOT NULL,
  CONSTRAINT faq_tag_pkey PRIMARY KEY (thread_id, tag),
  CONSTRAINT faq_tag_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES public.faq_thread (id) ON DELETE CASCADE,
  CONSTRAINT faq_tag_chk
    CHECK (tag = ANY (ARRAY[
      'installation'::text,
      'conda'::text,
      'python'::text,
      'metabarcoding'::text,
      'amplicon'::text,
      'wgs'::text,
      'rna-seq'::text,
      'phylogenetics'::text,
      'troubleshooting'::text,
      'biology'::text,
      'hpc'::text,
      'advice'::text,
      'programming'::text
    ]))
);

CREATE INDEX IF NOT EXISTS idx_faq_tag_tag
  ON public.faq_tag USING btree (tag);

CREATE TABLE IF NOT EXISTS public.faq_post (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  parent_id uuid NULL,
  author_id uuid NOT NULL,
  kind text NOT NULL,
  body text NOT NULL,
  deleted_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faq_post_pkey PRIMARY KEY (id),
  CONSTRAINT faq_post_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES public.faq_thread (id) ON DELETE CASCADE,
  CONSTRAINT faq_post_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.faq_post (id) ON DELETE CASCADE,
  CONSTRAINT faq_post_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.users (id) ON DELETE RESTRICT,
  CONSTRAINT faq_post_kind_chk
    CHECK (kind = ANY (ARRAY['answer'::text, 'comment'::text])),
  CONSTRAINT faq_post_body_chk
    CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 20000),
  CONSTRAINT faq_post_answer_parent_chk
    CHECK (kind <> 'answer' OR parent_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_faq_post_thread_id
  ON public.faq_post USING btree (thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_faq_post_parent_id
  ON public.faq_post USING btree (parent_id)
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.faq_thread
  DROP CONSTRAINT IF EXISTS faq_thread_accepted_post_id_fkey;
ALTER TABLE public.faq_thread
  ADD CONSTRAINT faq_thread_accepted_post_id_fkey
  FOREIGN KEY (accepted_post_id) REFERENCES public.faq_post (id)
  ON DELETE SET NULL;

-- ---- Row level security ------------------------------------

ALTER TABLE public.faq_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_post ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_thread select staff" ON public.faq_thread;
CREATE POLICY "faq_thread select staff"
  ON public.faq_thread FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_thread insert staff own" ON public.faq_thread;
CREATE POLICY "faq_thread insert staff own"
  ON public.faq_thread FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "faq_thread update own or lead" ON public.faq_thread;
CREATE POLICY "faq_thread update own or lead"
  ON public.faq_thread FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faq_thread delete own or lead" ON public.faq_thread;
CREATE POLICY "faq_thread delete own or lead"
  ON public.faq_thread FOR DELETE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faq_tag select staff" ON public.faq_tag;
CREATE POLICY "faq_tag select staff"
  ON public.faq_tag FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_tag insert own or lead" ON public.faq_tag;
CREATE POLICY "faq_tag insert own or lead"
  ON public.faq_tag FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND EXISTS (
      SELECT 1
      FROM public.faq_thread t
      WHERE t.id = faq_tag.thread_id
        AND (
          get_user_role() = 'team_lead'::text
          OR t.author_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "faq_tag delete own or lead" ON public.faq_tag;
CREATE POLICY "faq_tag delete own or lead"
  ON public.faq_tag FOR DELETE TO authenticated
  USING (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND EXISTS (
      SELECT 1
      FROM public.faq_thread t
      WHERE t.id = faq_tag.thread_id
        AND (
          get_user_role() = 'team_lead'::text
          OR t.author_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "faq_post select staff" ON public.faq_post;
CREATE POLICY "faq_post select staff"
  ON public.faq_post FOR SELECT TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP POLICY IF EXISTS "faq_post insert staff own" ON public.faq_post;
CREATE POLICY "faq_post insert staff own"
  ON public.faq_post FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "faq_post update own or lead" ON public.faq_post;
CREATE POLICY "faq_post update own or lead"
  ON public.faq_post FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faq_post delete own or lead" ON public.faq_post;
CREATE POLICY "faq_post delete own or lead"
  ON public.faq_post FOR DELETE TO authenticated
  USING (
    get_user_role() = 'team_lead'::text
    OR (
      get_user_role() = 'team_member'::text
      AND author_id = auth.uid()
    )
  );

-- ---- Write guards ------------------------------------------

CREATE OR REPLACE FUNCTION public.faq_thread_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_thread uuid;
  v_deleted timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.author_id := OLD.author_id;
  END IF;

  IF NEW.accepted_post_id IS NOT NULL
    AND (TG_OP = 'INSERT' OR NEW.accepted_post_id IS DISTINCT FROM OLD.accepted_post_id)
  THEN
    SELECT kind, thread_id, deleted_at
      INTO v_kind, v_thread, v_deleted
    FROM public.faq_post
    WHERE id = NEW.accepted_post_id;

    IF v_kind IS DISTINCT FROM 'answer'
      OR v_thread IS DISTINCT FROM NEW.id
      OR v_deleted IS NOT NULL
    THEN
      RAISE EXCEPTION 'Accepted post must be an undeleted answer on this question'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.closed_at := NULL;
    NEW.closed_by := NULL;
    IF NEW.status = 'closed' THEN
      NEW.closed_by := auth.uid();
      NEW.closed_at := now();
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'closed' THEN
      NEW.closed_by := auth.uid();
      NEW.closed_at := now();
    ELSE
      NEW.closed_by := NULL;
      NEW.closed_at := NULL;
    END IF;
  ELSE
    NEW.closed_by := OLD.closed_by;
    NEW.closed_at := OLD.closed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faq_thread_before_write ON public.faq_thread;
CREATE TRIGGER faq_thread_before_write
  BEFORE INSERT OR UPDATE ON public.faq_thread
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_thread_before_write();

CREATE OR REPLACE FUNCTION public.faq_thread_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() IS DISTINCT FROM 'team_lead'
    AND EXISTS (
      SELECT 1
      FROM public.faq_post
      WHERE thread_id = OLD.id
        AND kind = 'answer'
        AND deleted_at IS NULL
    )
  THEN
    RAISE EXCEPTION 'Cannot delete a question that already has answers'
      USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS faq_thread_before_delete ON public.faq_thread;
CREATE TRIGGER faq_thread_before_delete
  BEFORE DELETE ON public.faq_thread
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_thread_before_delete();

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

  IF TG_OP = 'INSERT' AND NEW.kind = 'answer' THEN
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

DROP TRIGGER IF EXISTS faq_post_before_write ON public.faq_post;
CREATE TRIGGER faq_post_before_write
  BEFORE INSERT OR UPDATE ON public.faq_post
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_post_before_write();

CREATE OR REPLACE FUNCTION public.faq_post_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.faq_thread
    SET accepted_post_id = NULL
    WHERE accepted_post_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faq_post_after_update ON public.faq_post;
CREATE TRIGGER faq_post_after_update
  AFTER UPDATE ON public.faq_post
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_post_after_update();

-- ---- Notifications -----------------------------------------

CREATE OR REPLACE FUNCTION public.faq_post_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_author uuid;
  v_title text;
  v_author_name text;
  v_parent_author uuid;
  v_type text;
  v_clip text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT author_id, title INTO v_thread_author, v_title
  FROM public.faq_thread
  WHERE id = NEW.thread_id;

  SELECT name INTO v_author_name
  FROM public.users
  WHERE id = NEW.author_id;

  v_clip := left(btrim(NEW.body), 280);
  v_type := CASE
    WHEN NEW.kind = 'answer' THEN 'faq_answer_added'
    ELSE 'faq_comment_added'
  END;

  IF v_thread_author IS NOT NULL AND v_thread_author IS DISTINCT FROM NEW.author_id THEN
    INSERT INTO public.notifications (type, payload, target_user_id)
    VALUES (
      v_type,
      jsonb_build_object(
        'faq_id', NEW.thread_id,
        'post_id', NEW.id,
        'title', v_title,
        'comment', v_clip,
        'comment_author', v_author_name,
        'kind', NEW.kind
      ),
      v_thread_author
    );
  END IF;

  IF NEW.kind = 'comment' AND NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author
    FROM public.faq_post
    WHERE id = NEW.parent_id;

    IF v_parent_author IS NOT NULL
      AND v_parent_author IS DISTINCT FROM NEW.author_id
      AND v_parent_author IS DISTINCT FROM v_thread_author
    THEN
      INSERT INTO public.notifications (type, payload, target_user_id)
      VALUES (
        'faq_comment_added',
        jsonb_build_object(
          'faq_id', NEW.thread_id,
          'post_id', NEW.id,
          'title', v_title,
          'comment', v_clip,
          'comment_author', v_author_name,
          'kind', NEW.kind
        ),
        v_parent_author
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faq_post_notify ON public.faq_post;
CREATE TRIGGER faq_post_notify
  AFTER INSERT ON public.faq_post
  FOR EACH ROW
  EXECUTE FUNCTION public.faq_post_notify();

DROP TRIGGER IF EXISTS set_updated_at ON public.faq_thread;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.faq_thread
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.faq_post;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.faq_post
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.faq_thread TO authenticated;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.faq_tag TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.faq_post TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.faq_post;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping.';
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.faq_thread;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping.';
END $$;
