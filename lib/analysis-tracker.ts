import type { AnalysisStatus } from "@/types/database";

/** Canonical analysis classification options (Sequence Analysis form). */
export const ANALYSIS_OPTIONS = [
  "Amplicon",
  "Whole Genome Assembly",
  "16s Metabarcoding",
  "eDNA Analysis",
  "Phylogenetics",
  "Transcriptomics",
  "CapSeq",
  "mtDNA",
  "cpDNA",
  "Shotgun Metagenomics",
  "Population Genetics",
  "Others",
] as const;

export type AnalysisOption = (typeof ANALYSIS_OPTIONS)[number];
export const ANALYSIS_OTHER = "Others" as const;

/** Excel / legacy aliases → app classification. */
const CLASSIFICATION_ALIASES: Record<string, AnalysisOption> = {
  "wgs analyses": "Whole Genome Assembly",
  "wgs analysis": "Whole Genome Assembly",
  "whole genome assembly": "Whole Genome Assembly",
  "16s metabarcoding": "16s Metabarcoding",
  "16S Metabarcoding": "16s Metabarcoding",
  amplicon: "Amplicon",
  "edna analysis": "eDNA Analysis",
  phylogenetics: "Phylogenetics",
  transcriptomics: "Transcriptomics",
  capseq: "CapSeq",
  mtdna: "mtDNA",
  cpdna: "cpDNA",
  "shotgun metagenomics": "Shotgun Metagenomics",
  "population genetics": "Population Genetics",
  others: "Others",
};

export const CLIENT_TYPE_OPTIONS = [
  "UPV",
  "PGCV",
  "SUCs",
  "Private",
  "Government",
  "Projects",
  "UP System",
  "Others",
] as const;

export const STATUS_OF_COMPLETION_OPTIONS = [
  "On-going",
  "On hold (for payment)",
  "Completed",
  "Cancelled",
] as const;

export const CHANGES_REQUESTED = "Changes requested" as const;

export const STATUS_OF_SUBMISSION_OPTIONS = [
  "For approval",
  "Under review",
  CHANGES_REQUESTED,
  "Approved",
  "Submitted",
] as const;

/**
 * What a user may pick by hand. "Changes requested" is omitted deliberately:
 * it is only ever reached through `request_analysis_changes`, which also
 * records the comment and notifies the assignee. Choosing it from a dropdown
 * would leave the report blocked with nothing explaining why.
 */
export const MANUAL_STATUS_OF_SUBMISSION_OPTIONS: readonly string[] =
  STATUS_OF_SUBMISSION_OPTIONS.filter((s) => s !== CHANGES_REQUESTED);

/**
 * Rank used so review actions never move a report backwards.
 *
 * "Changes requested" sits at 0, outside the ladder, because it is the one
 * transition that legitimately goes backwards — it hands the report back to the
 * analyst. It is set explicitly by `request_analysis_changes`, never by an
 * auto-advance, and resubmitting to "For approval" climbs the ladder normally.
 */
export function submissionStatusRank(label: string | null | undefined): number {
  const t = String(label ?? "")
    .trim()
    .toLowerCase();
  if (t === "submitted") return 4;
  if (t === "approved") return 3;
  if (t === "under review" || t === "under_review") return 2;
  if (t === "for approval" || t === "for_approval") return 1;
  return 0;
}

export function isChangesRequestedLabel(
  label: string | null | undefined,
): boolean {
  const t = String(label ?? "")
    .trim()
    .toLowerCase();
  return t === "changes requested" || t === "changes_requested";
}

export function shouldAdvanceSubmissionStatus(
  current: string | null | undefined,
  next: string,
): boolean {
  return submissionStatusRank(next) > submissionStatusRank(current);
}

export function normalizeClassification(
  raw: string | null | undefined,
): AnalysisOption | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (CLASSIFICATION_ALIASES[lower]) return CLASSIFICATION_ALIASES[lower]!;
  const exact = ANALYSIS_OPTIONS.find((o) => o.toLowerCase() === lower);
  return exact ?? null;
}

/** Map free-text Excel / form status labels onto the legacy analysis_status enum. */
export function mapLabelToAnalysisStatus(
  label: string | null | undefined,
): AnalysisStatus | null {
  if (label == null) return null;
  const t = String(label).trim().toLowerCase();
  if (!t) return null;
  if (t === "completed") return "completed";
  if (t === "on-going" || t === "ongoing" || t === "on going") return "ongoing";
  if (t === "submitted") return "submitted";
  if (t === "approved") return "submitted";
  if (t === "under review" || t === "under_review") return "for_approval";
  if (t === "for approval" || t === "for_approval") return "for_approval";
  if (t === "changes requested" || t === "changes_requested")
    return "for_approval";
  if (t.includes("on hold") || t === "on_hold") return "on_hold";
  return null;
}

/** Prefer completion status, then submission; default for_approval. */
export function deriveLegacyStatus(input: {
  status_of_completion?: string | null;
  status_of_submission?: string | null;
}): AnalysisStatus {
  return (
    mapLabelToAnalysisStatus(input.status_of_completion) ??
    mapLabelToAnalysisStatus(input.status_of_submission) ??
    "for_approval"
  );
}

export function formatServiceReportNumber(
  prefix: string | null | undefined,
  suffix: string | number | null | undefined,
): string | null {
  const p = prefix == null ? "" : String(prefix).trim();
  if (!p) return null;
  if (suffix == null || String(suffix).trim() === "") return p;
  const n = Number(suffix);
  const padded =
    Number.isFinite(n) && String(suffix).trim() !== ""
      ? String(Math.trunc(n)).padStart(3, "0")
      : String(suffix).trim().padStart(3, "0");
  return `${p}-${padded}`;
}

const SR_NUMBER_RE = /^PGCV-BIOINFO-SR-(\d{4})-(\d+)$/i;

/** Parse `PGCV-BIOINFO-SR-YYYY-NNN` into year + sequence. */
export function parseServiceReportNumber(
  value: string | null | undefined,
): { year: number; sequence: number } | null {
  if (!value) return null;
  const m = String(value).trim().match(SR_NUMBER_RE);
  if (!m) return null;
  return { year: Number(m[1]), sequence: Number(m[2]) };
}

/**
 * Next SR number after the highest existing sequence.
 * Format: PGCV-BIOINFO-SR-{currentYear}-{NNN} (sequence is global, not reset yearly).
 */
export function nextServiceReportNumber(
  existing: Array<string | null | undefined>,
  now: Date = new Date(),
): string {
  let maxSeq = 0;
  for (const value of existing) {
    const parsed = parseServiceReportNumber(value);
    if (parsed && parsed.sequence > maxSeq) maxSeq = parsed.sequence;
  }
  const year = now.getFullYear();
  const next = maxSeq + 1;
  return `PGCV-BIOINFO-SR-${year}-${String(next).padStart(3, "0")}`;
}

/** Display label for cards/lists: Others uses application specify text. */
export function displayAnalysisLabel(
  pipeline: string | null | undefined,
  application?: string | null,
): string {
  const app = application?.trim();
  const pipe = pipeline?.trim();
  if (pipe === ANALYSIS_OTHER && app) return app;
  if (app && (!pipe || pipe === ANALYSIS_OTHER)) return app;
  if (pipe) return pipe;
  if (app) return app;
  return "—";
}

/**
 * "Cancelled" has no `analysis_status` enum value, so it only ever lives in
 * `status_of_completion`. Callers that need to react to it must check the label.
 */
export function isCancelledCompletionLabel(
  label: string | null | undefined,
): boolean {
  return String(label ?? "").trim().toLowerCase() === "cancelled";
}

/**
 * Status text for an analysis shown outside the tracker (e.g. on a linked task).
 * Prefers the tracker's own labels so the granularity the legacy enum drops
 * ("Under review" vs "Approved") stays visible.
 */
export function analysisStatusLabel(input: {
  status_of_completion?: string | null;
  status_of_submission?: string | null;
  status?: AnalysisStatus | null;
}): string {
  const completion = input.status_of_completion?.trim();
  if (completion) return completion;
  const submission = input.status_of_submission?.trim();
  if (submission) return submission;
  return input.status ? labelFromAnalysisStatus(input.status) : "—";
}

export function labelFromAnalysisStatus(status: AnalysisStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "ongoing":
      return "On-going";
    case "submitted":
      return "Submitted";
    case "for_approval":
      return "For approval";
    case "on_hold":
      return "On hold (for payment)";
    default:
      return status;
  }
}
