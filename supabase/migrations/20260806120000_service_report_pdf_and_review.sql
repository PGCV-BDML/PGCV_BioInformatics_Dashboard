-- ============================================================
-- 20260806120000_service_report_pdf_and_review.sql
--
-- Two related changes to the Service Report Tracker:
--
-- 1. The report itself becomes an uploaded PDF rather than a
--    pasted URL. service_report_link is deliberately kept: older
--    records only ever had a link, and some clients are still
--    handed a Drive URL rather than a file.
--
-- 2. A peer review stage lands in front of the approving officer.
--    A second lab member (the reviewing officer) has to sign the
--    report off before the officer is ever notified.
--
-- The review stage gets its own vocabulary — "In review" rather
-- than "Under review" — because status_of_submission already uses
-- "Under review" for the approving officer's own pass. Two columns
-- reading the same word would be unreadable in the tracker table.
-- ============================================================

ALTER TABLE public.analysis
  ADD COLUMN IF NOT EXISTS service_report_file_path   text        NULL,
  ADD COLUMN IF NOT EXISTS service_report_file_name   text        NULL,
  ADD COLUMN IF NOT EXISTS service_report_file_size   bigint      NULL,
  ADD COLUMN IF NOT EXISTS service_report_uploaded_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS service_report_uploaded_by uuid        NULL
    REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_of_review           text        NULL,
  ADD COLUMN IF NOT EXISTS reviewer_user_id           uuid        NULL
    REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_reviewer_user_id
  ON public.analysis (reviewer_user_id);

CREATE INDEX IF NOT EXISTS idx_analysis_status_of_review
  ON public.analysis (status_of_review);

-- Reviewing officer must be a second pair of eyes: not the assignee who
-- produced the report, and not the same person who will later approve it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analysis_reviewer_not_assignee'
  ) THEN
    ALTER TABLE public.analysis
      ADD CONSTRAINT analysis_reviewer_not_assignee
      CHECK (
        reviewer_user_id IS NULL
        OR assignee_id IS NULL
        OR reviewer_user_id IS DISTINCT FROM assignee_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analysis_reviewer_not_approver'
  ) THEN
    ALTER TABLE public.analysis
      ADD CONSTRAINT analysis_reviewer_not_approver
      CHECK (
        reviewer_user_id IS NULL
        OR approver_user_id IS NULL
        OR reviewer_user_id IS DISTINCT FROM approver_user_id
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- Comment stage
-- ------------------------------------------------------------
-- Existing rows all came from request_analysis_changes, which is
-- the approving officer's path, so 'approval' is the correct
-- backfill as well as the correct default for that RPC.
ALTER TABLE public.analysis_review_comment
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'approval';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analysis_review_comment_stage_check'
  ) THEN
    ALTER TABLE public.analysis_review_comment
      ADD CONSTRAINT analysis_review_comment_stage_check
      CHECK (stage IN ('review', 'approval'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- Backfill review status for records already past the review gate
-- ------------------------------------------------------------
-- Anything already Approved or Submitted was signed off under the
-- old two-stage flow. Leaving status_of_review blank would make
-- those records look like they had skipped review, and would let
-- the new trigger re-notify a reviewer on the next unrelated edit.
UPDATE public.analysis
SET status_of_review = 'Reviewed'
WHERE status_of_review IS NULL
  AND lower(btrim(coalesce(status_of_submission, ''))) IN ('approved', 'submitted');

-- Records sitting with the old approving officer are mid-approval,
-- so they are past review too.
UPDATE public.analysis
SET status_of_review = 'Reviewed'
WHERE status_of_review IS NULL
  AND lower(btrim(coalesce(status_of_submission, ''))) IN
      ('for approval', 'under review', 'changes requested');
