-- ============================================================
-- 20260731120000_team_chat.sql
--
-- Real-time staff chat: conversations, membership, messages.
--
-- Two conversation kinds share one schema so direct messages can
-- be added later without a second table:
--
--   'channel' — open to all staff (team_lead / team_member).
--               Membership rows exist only to track last_read_at.
--   'direct'  — visible only to users with a membership row.
--
-- Access is centralised in public.can_access_conversation(). It is
-- SECURITY DEFINER, which is load-bearing: the message policies
-- need to consult conversation_member, and the conversation_member
-- policies need the same answer. Without DEFINER (RLS bypassed
-- inside the function) those two policies would recurse.
--
-- Idempotent; safe to re-run.
-- ============================================================

BEGIN;

-- ---- 1. Types ----------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.conversation_kind AS ENUM ('channel', 'direct');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---- 2. Tables ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       public.conversation_kind NOT NULL DEFAULT 'channel',
  name       text NULL,
  created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per person per conversation. last_read_at drives the
-- unread badge; it is the only reason channels carry member rows.
CREATE TABLE IF NOT EXISTS public.conversation_member (
  conversation_id uuid NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (btrim(body) <> '' AND length(body) <= 4000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz NULL,
  -- Soft delete: "delete for everyone" without tearing a hole in
  -- the thread, and the audit trail survives.
  deleted_at      timestamptz NULL
);

-- The one query the chat panel runs constantly: newest N in a
-- conversation. DESC matches the fetch order so it reads backwards.
CREATE INDEX IF NOT EXISTS idx_message_conversation_created
  ON public.message (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_member_user
  ON public.conversation_member (user_id);

-- ---- 3. Access helper --------------------------------------
-- SECURITY DEFINER on purpose; see the header note on recursion.
CREATE OR REPLACE FUNCTION public.can_access_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation c
    WHERE c.id = conv_id
      AND (
        (
          c.kind = 'channel'
          AND public.get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
        )
        OR EXISTS (
          SELECT 1 FROM public.conversation_member m
          WHERE m.conversation_id = c.id AND m.user_id = auth.uid()
        )
      )
  );
$$;

-- ---- 4. RLS ------------------------------------------------
ALTER TABLE public.conversation        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message             ENABLE ROW LEVEL SECURITY;

-- conversation --
DROP POLICY IF EXISTS "conversation select accessible" ON public.conversation;
CREATE POLICY "conversation select accessible"
  ON public.conversation FOR SELECT TO authenticated
  USING (public.can_access_conversation(id));

DROP POLICY IF EXISTS "conversation insert staff" ON public.conversation;
CREATE POLICY "conversation insert staff"
  ON public.conversation FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text])
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "conversation update lead" ON public.conversation;
CREATE POLICY "conversation update lead"
  ON public.conversation FOR UPDATE TO authenticated
  USING (get_user_role() = 'team_lead'::text)
  WITH CHECK (get_user_role() = 'team_lead'::text);

DROP POLICY IF EXISTS "conversation delete lead" ON public.conversation;
CREATE POLICY "conversation delete lead"
  ON public.conversation FOR DELETE TO authenticated
  USING (get_user_role() = 'team_lead'::text);

-- conversation_member --
-- Readable by anyone in the conversation, so the panel can show
-- who is in a thread and when they last read it.
DROP POLICY IF EXISTS "conversation_member select accessible" ON public.conversation_member;
CREATE POLICY "conversation_member select accessible"
  ON public.conversation_member FOR SELECT TO authenticated
  USING (public.can_access_conversation(conversation_id));

-- You add yourself to a conversation you can already reach; you do
-- not add other people. Channels are open, so this is just the
-- last_read_at bookmark being created on first open.
DROP POLICY IF EXISTS "conversation_member insert self" ON public.conversation_member;
CREATE POLICY "conversation_member insert self"
  ON public.conversation_member FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_conversation(conversation_id)
  );

DROP POLICY IF EXISTS "conversation_member update self" ON public.conversation_member;
CREATE POLICY "conversation_member update self"
  ON public.conversation_member FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "conversation_member delete self or lead" ON public.conversation_member;
CREATE POLICY "conversation_member delete self or lead"
  ON public.conversation_member FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'team_lead'::text);

-- message --
DROP POLICY IF EXISTS "message select accessible" ON public.message;
CREATE POLICY "message select accessible"
  ON public.message FOR SELECT TO authenticated
  USING (public.can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "message insert own" ON public.message;
CREATE POLICY "message insert own"
  ON public.message FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_conversation(conversation_id)
  );

-- Edit and soft-delete your own messages only. A team_lead can
-- soft-delete anyone's (moderation) but cannot rewrite their words.
DROP POLICY IF EXISTS "message update own" ON public.message;
CREATE POLICY "message update own"
  ON public.message FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR get_user_role() = 'team_lead'::text
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR get_user_role() = 'team_lead'::text
  );

-- No hard deletes from the client; deleted_at is the delete path.
DROP POLICY IF EXISTS "message no direct delete" ON public.message;
CREATE POLICY "message no direct delete"
  ON public.message FOR DELETE TO authenticated
  USING (false);

-- ---- 5. Triggers -------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.conversation;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.conversation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Bump the parent conversation so thread lists can sort by recency
-- without an aggregate over message.
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_conversation ON public.message;
CREATE TRIGGER touch_conversation
  AFTER INSERT ON public.message
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_conversation_on_message();

-- ---- 6. Realtime -------------------------------------------
-- The panel subscribes to postgres_changes on message.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping.';
END $$;

-- ---- 7. Seed the default channel ---------------------------
INSERT INTO public.conversation (kind, name)
SELECT 'channel', 'General'
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation WHERE kind = 'channel' AND name = 'General'
);

COMMIT;
