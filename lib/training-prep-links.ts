import { validateExternalDocumentLink } from "@/lib/onboarding-document-file";
import { supabase } from "@/lib/supabase";
import { nextPrepSortOrder } from "@/lib/training-prep-checklist";
import type { TrainingPrepLink } from "@/types/database";

const MAX_TITLE_LENGTH = 200;
const MAX_URL_LENGTH = 2000;

export function validateTrainingPrepLinkTitle(value: string): string | null {
  const title = value.trim();
  if (!title) return "Add a link title.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `Keep the link title under ${MAX_TITLE_LENGTH} characters.`;
  }
  return null;
}

export function normalizeTrainingPrepLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateTrainingPrepLinkUrl(raw: string): string | null {
  const normalized = normalizeTrainingPrepLinkUrl(raw);
  if (normalized.length > MAX_URL_LENGTH) {
    return `Keep the link under ${MAX_URL_LENGTH} characters.`;
  }
  return validateExternalDocumentLink(normalized);
}

export function nextPrepLinkSortOrder(
  links: Pick<TrainingPrepLink, "sort_order">[],
): number {
  return nextPrepSortOrder(links);
}

export async function getTrainingPrepLinks(
  programId: string,
): Promise<TrainingPrepLink[]> {
  const { data, error } = await supabase
    .from("training_prep_link")
    .select("*")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("Error retrieving training prep links:", error);
    throw error;
  }

  return (data ?? []) as TrainingPrepLink[];
}
