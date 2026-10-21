-- ============================================================
-- 20261021120000_program_chat_kind.sql
--
-- A third conversation kind for per-program chats. The tables,
-- policies and backfill live in 20261021120100_program_chat.sql.
--
-- Not wrapped in BEGIN/COMMIT: a value added with ALTER TYPE ...
-- ADD VALUE cannot be used until it is committed, and the next
-- migration uses it. Run this file on its own, before that one.
-- ============================================================

ALTER TYPE public.conversation_kind ADD VALUE IF NOT EXISTS 'program';
