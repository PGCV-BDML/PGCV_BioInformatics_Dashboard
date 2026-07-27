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
  "Completed",
  "On-going",
  "On hold (for payment)",
  "Submitted",
  "For approval",
] as const;

export const STATUS_OF_SUBMISSION_OPTIONS = [
  "Submitted",
  "For approval",
  "On-going",
  "Completed",
  "On hold (for payment)",
] as const;

export const STATUS_OF_ANALYSIS_OPTIONS = [
  "Completed",
  "On-going",
  "On hold (for payment)",
  "Submitted",
  "For approval",
] as const;

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
  if (t === "for approval" || t === "for_approval") return "for_approval";
  if (t.includes("on hold") || t === "on_hold") return "on_hold";
  return null;
}

/** Prefer completion status, then submission, then analysis; default for_approval. */
export function deriveLegacyStatus(input: {
  status_of_completion?: string | null;
  status_of_submission?: string | null;
  status_of_analysis?: string | null;
}): AnalysisStatus {
  return (
    mapLabelToAnalysisStatus(input.status_of_completion) ??
    mapLabelToAnalysisStatus(input.status_of_submission) ??
    mapLabelToAnalysisStatus(input.status_of_analysis) ??
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
