-- ============================================================
-- 20260730130000_client_profile_fields_drift.sql
--
-- Reconciles public.client with what 20260727000000_expand_
-- client_profile_fields.sql was supposed to add. That migration
-- declares six columns; only project_id and designation are
-- present on the live database. The other four are missing:
--
--   email_address, sex, mobile_number, affiliation_address
--
-- Consequences of the gap:
--   * lib/clients.ts SupabaseClientRow types all four, so the
--     app believes it can read and write them.
--   * buildClientPayload sends email_address on every insert.
--     PostgREST rejects unknown columns with PGRST204 before RLS
--     is consulted, so adding a client fails.
--   * mapClientRowToRecord fell back to contact_info for the
--     email, which put client names under the Email column.
--
-- Also backfills email_address from the legacy contact_info
-- column, which packs "email | affiliation" and falls back to
-- the client's name.
--
-- Idempotent; safe to re-run.
-- ============================================================

BEGIN;

-- ---- 1. The four missing columns ---------------------------
-- Same definitions as the original migration, so re-running that
-- one after this is a no-op.
ALTER TABLE public.client
  ADD COLUMN IF NOT EXISTS email_address       text NULL,
  ADD COLUMN IF NOT EXISTS sex                 text NULL,
  ADD COLUMN IF NOT EXISTS mobile_number       text NULL,
  ADD COLUMN IF NOT EXISTS affiliation_address text NULL;

-- ---- 2. Backfill email_address from contact_info -----------
-- contact_info is NOT NULL and predates email_address. It holds
-- one of: "email | affiliation", a bare email, an affiliation, or
-- the client's name. Only lift out a real address; leave the rest
-- alone rather than guessing.
--
-- The pattern mirrors EMAIL_IN_TEXT in lib/clients.ts so the
-- database and the client agree on what counts as an address.
UPDATE public.client
SET email_address = substring(
      contact_info from '[^[:space:]|,;<>()]+@[^[:space:]|,;<>()]+\.[A-Za-z]{2,}'
    )
WHERE email_address IS NULL
  AND contact_info IS NOT NULL
  AND contact_info ~ '[^[:space:]|,;<>()]+@[^[:space:]|,;<>()]+\.[A-Za-z]{2,}';

-- ---- 3. Report -----------------------------------------------
DO $$
DECLARE total bigint; filled bigint;
BEGIN
  SELECT count(*), count(email_address) INTO total, filled FROM public.client;
  RAISE NOTICE 'client rows: %, with an email address: %', total, filled;
END $$;

COMMIT;
