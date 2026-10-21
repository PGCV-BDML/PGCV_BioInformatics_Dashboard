-- ============================================================
-- 20261021120100_program_chat.sql
--
-- One chat per training or internship program, readable only by
-- the team and the learners enrolled in that program. Builds on the
-- team-chat tables (20260731120000_team_chat.sql).
--
-- Run 20261021120000_program_chat_kind.sql first, on its own; this
-- file uses the 'program' kind it adds.
--
--   * conversation.program_id ties a 'program' chat to its program.
--     A trigger creates the chat with each new program; existing
--     programs are backfilled below.
--   * can_access_conversation() learns the program kind. Membership
--     rows now grant access to 'direct' conversations only: they are
--     read bookmarks, and a dropped trainee (or demoted staff member)
--     must not keep a chat because they once opened it.
--   * Learners post while enrolled or completed; nobody posts once
--     the program is archived.
--   * Any staff member may remove messages in a program chat.
--   * A message can no longer be moved to another conversation,
--     reassigned, re-dated or restored, and only its sender may
--     change its text. The old update policy only checked sender_id.
--   * Deleting a program-chat message blanks its text, so a trainee
--     who posts something by mistake can remove it for real. The
--     staff channel keeps the original text as its audit trail.
--   * conversation_people() gives chat members each other's display
--     names. Learners cannot read fellow learners in public.users,
--     and a row policy would expose the whole row (email, signature).
--
-- Idempotent; safe to re-run.
-- ============================================================

BEGIN;

-- ---- 1. Link a conversation to its program -----------------
ALTER TABLE public.conversation
  ADD COLUMN IF NOT EXISTS program_id uuid NULL
    REFERENCES public.training_program(id) ON DELETE CASCADE;

ALTER TABLE public.conversation
  DROP CONSTRAINT IF EXISTS conversation_program_matches_kind;
ALTER TABLE public.conversation
  ADD CONSTRAINT conversation_program_matches_kind
  CHECK ((kind = 'program') = (program_id IS NOT NULL));

-- One chat per program; also the lookup index for the panel.
CREATE UNIQUE INDEX IF NOT EXISTS conversation_program_id_uidx
  ON public.conversation (program_id)
  WHERE program_id IS NOT NULL;

-- ---- 2. Access helpers -------------------------------------
-- SECURITY DEFINER for the same reason as can_access_conversation:
-- policies on message and conversation_member call these.

-- Staff, or a learner whose role matches the program type and who
-- is enrolled (or completed). Mirrors the training_program policy.
CREATE OR REPLACE FUNCTION public.can_access_program_chat(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
    OR EXISTS (
      SELECT 1
      FROM public.training_program p
      WHERE p.id = p_program_id
        AND public.is_enrolled_in_program(p.id)
        AND (
          (p.type = 'training'::public.training_type
            AND public.get_user_role()::text = 'trainee')
          OR (p.type = 'internship'::public.training_type
            AND public.get_user_role()::text = 'intern')
        )
    );
$$;

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
          AND public.get_user_role()::text = ANY (ARRAY['team_lead', 'team_member'])
        )
        OR (
          c.kind = 'program'
          AND public.can_access_program_chat(c.program_id)
        )
        OR (
          c.kind = 'direct'
          AND EXISTS (
            SELECT 1 FROM public.conversation_member m
            WHERE m.conversation_id = c.id AND m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- Reading is not enough to post: an archived program is read-only.
CREATE OR REPLACE FUNCTION public.can_post_in_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_conversation(conv_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.conversation c
      JOIN public.training_program p ON p.id = c.program_id
      WHERE c.id = conv_id
        AND p.status = 'archived'::public.training_program_status
    );
$$;

-- Who may remove other people's messages: the team lead anywhere,
-- and any staff member in a program chat.
CREATE OR REPLACE FUNCTION public.can_moderate_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_user_role()::text = 'team_lead'
    OR (
      public.get_user_role()::text = 'team_member'
      AND EXISTS (
        SELECT 1 FROM public.conversation c
        WHERE c.id = conv_id AND c.kind = 'program'
      )
    );
$$;

-- ---- 3. Message policies -----------------------------------
DROP POLICY IF EXISTS "message insert own" ON public.message;
CREATE POLICY "message insert own"
  ON public.message FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.can_post_in_conversation(conversation_id)
  );

-- Senders delete their own messages; moderators delete anyone's.
-- Which columns may change is enforced by guard_message_update().
DROP POLICY IF EXISTS "message update own" ON public.message;
CREATE POLICY "message update own"
  ON public.message FOR UPDATE TO authenticated
  USING (
    (
      sender_id = (SELECT auth.uid())
      AND public.can_access_conversation(conversation_id)
    )
    OR public.can_moderate_conversation(conversation_id)
  )
  WITH CHECK (
    (
      sender_id = (SELECT auth.uid())
      AND public.can_access_conversation(conversation_id)
    )
    OR public.can_moderate_conversation(conversation_id)
  );

-- ---- 4. Guard message updates ------------------------------
CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'A message cannot be moved, reassigned or re-dated';
  END IF;

  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'A deleted message cannot be restored';
  END IF;

  -- Moderators remove messages; they do not rewrite them. No caller
  -- id means a server-side maintenance session, which may.
  IF NEW.body IS DISTINCT FROM OLD.body
     AND auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'Only the sender can edit a message';
  END IF;

  IF OLD.deleted_at IS NULL
     AND NEW.deleted_at IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.conversation c
       WHERE c.id = NEW.conversation_id AND c.kind = 'program'
     ) THEN
    NEW.body := 'Message deleted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_message_update ON public.message;
CREATE TRIGGER guard_message_update
  BEFORE UPDATE ON public.message
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_message_update();

-- ---- 5. Display names for chat members ---------------------
-- Everyone enrolled in the program plus anyone who has posted.
-- Only what a chat bubble needs; nothing for a conversation the
-- caller cannot open.
CREATE OR REPLACE FUNCTION public.conversation_people(conv_id uuid)
RETURNS TABLE (id uuid, name text, is_staff boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.role::text = ANY (ARRAY['team_lead', 'team_member']) AS is_staff
  FROM public.users u
  WHERE public.can_access_conversation(conv_id)
    AND (
      u.id IN (
        SELECT m.sender_id FROM public.message m
        WHERE m.conversation_id = conv_id
      )
      OR u.id IN (
        SELECT pe.user_id
        FROM public.conversation c
        JOIN public.program_enrollment pe ON pe.program_id = c.program_id
        WHERE c.id = conv_id
          AND pe.status = ANY (
            ARRAY[
              'enrolled'::public.enrollment_status,
              'completed'::public.enrollment_status
            ]
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.conversation_people(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_people(uuid) TO authenticated;

-- ---- 6. One chat per program -------------------------------
CREATE OR REPLACE FUNCTION public.create_program_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation (kind, program_id)
  VALUES ('program', NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_program_conversation ON public.training_program;
CREATE TRIGGER create_program_conversation
  AFTER INSERT ON public.training_program
  FOR EACH ROW
  EXECUTE FUNCTION public.create_program_conversation();

INSERT INTO public.conversation (kind, program_id)
SELECT 'program', p.id
FROM public.training_program p
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation c WHERE c.program_id = p.id
);

COMMIT;
