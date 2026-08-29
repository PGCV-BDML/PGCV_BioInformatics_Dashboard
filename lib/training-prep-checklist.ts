import { supabase } from "@/lib/supabase";
import type { TrainingPrepCategory, TrainingPrepItem } from "@/types/database";

export type DefaultTrainingPrepItem = {
  key: string;
  category: TrainingPrepCategory;
  label: string;
  sort_order: number;
};

export const TRAINING_PREP_CATEGORIES: {
  id: TrainingPrepCategory;
  label: string;
  hint: string;
}[] = [
  {
    id: "venue",
    label: "Venue & equipment",
    hint: "Room, projector, power, and network",
  },
  {
    id: "documents",
    label: "Letters & documents",
    hint: "Invites, confirmations, and paper forms",
  },
  {
    id: "hospitality",
    label: "Hospitality & materials",
    hint: "Food, kits, handouts, and banner",
  },
  {
    id: "day_of",
    label: "Day of training",
    hint: "Registration, documentation, and certificates",
  },
];

export const DEFAULT_TRAINING_PREP_ITEMS: readonly DefaultTrainingPrepItem[] = [
  {
    key: "venue_reserved",
    category: "venue",
    label: "Venue reserved and confirmed",
    sort_order: 10,
  },
  {
    key: "projector",
    category: "venue",
    label: "Projector / LCD",
    sort_order: 20,
  },
  {
    key: "cables",
    category: "venue",
    label: "HDMI cable and adapters",
    sort_order: 30,
  },
  {
    key: "extension_cords",
    category: "venue",
    label: "Extension cords / power strips",
    sort_order: 40,
  },
  {
    key: "presenter_laptop",
    category: "venue",
    label: "Presenter laptop charged (plus backup)",
    sort_order: 50,
  },
  {
    key: "audio",
    category: "venue",
    label: "Speakers / microphone",
    sort_order: 60,
  },
  {
    key: "wifi",
    category: "venue",
    label: "Internet / Wi-Fi access",
    sort_order: 70,
  },
  {
    key: "workstations",
    category: "venue",
    label: "Workstations ready (hands-on sessions)",
    sort_order: 80,
  },
  {
    key: "invitation_letter",
    category: "documents",
    label: "Invitation / request letter to the institution",
    sort_order: 90,
  },
  {
    key: "confirmation_letters",
    category: "documents",
    label: "Confirmation letters or emails to participants",
    sort_order: 100,
  },
  {
    key: "attendance_sheet",
    category: "documents",
    label: "Attendance sheet",
    sort_order: 110,
  },
  {
    key: "agenda",
    category: "documents",
    label: "Printed program / agenda",
    sort_order: 120,
  },
  {
    key: "name_tags",
    category: "documents",
    label: "Name tags",
    sort_order: 130,
  },
  {
    key: "consent_forms",
    category: "documents",
    label: "Consent / waiver forms (if needed)",
    sort_order: 140,
  },
  {
    key: "meals",
    category: "hospitality",
    label: "Snacks / meals arranged",
    sort_order: 150,
  },
  {
    key: "water",
    category: "hospitality",
    label: "Drinking water",
    sort_order: 160,
  },
  {
    key: "kits",
    category: "hospitality",
    label: "Participant kits / tokens",
    sort_order: 170,
  },
  {
    key: "handouts",
    category: "hospitality",
    label: "Printed handouts or USB with materials",
    sort_order: 180,
  },
  {
    key: "banner",
    category: "hospitality",
    label: "Tarpaulin / banner",
    sort_order: 190,
  },
  {
    key: "registration_table",
    category: "day_of",
    label: "Registration table set up",
    sort_order: 200,
  },
  {
    key: "documentation",
    category: "day_of",
    label: "Photo / video documentation",
    sort_order: 210,
  },
  {
    key: "certificates_ready",
    category: "day_of",
    label: "Certificates ready to issue",
    sort_order: 220,
  },
];

const MAX_LABEL_LENGTH = 200;
const MAX_NOTES_LENGTH = 500;

export function missingDefaultTrainingPrepItems(
  existingKeys: Iterable<string | null | undefined>,
): DefaultTrainingPrepItem[] {
  const have = new Set<string>();
  for (const key of existingKeys) {
    if (typeof key === "string" && key.length > 0) have.add(key);
  }
  return DEFAULT_TRAINING_PREP_ITEMS.filter((item) => !have.has(item.key));
}

export function trainingPrepProgress(items: Pick<TrainingPrepItem, "is_done">[]): {
  done: number;
  total: number;
  percent: number;
} {
  const total = items.length;
  const done = items.filter((item) => item.is_done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function groupTrainingPrepItems(
  items: TrainingPrepItem[],
): Record<TrainingPrepCategory, TrainingPrepItem[]> {
  const grouped: Record<TrainingPrepCategory, TrainingPrepItem[]> = {
    venue: [],
    documents: [],
    hospitality: [],
    day_of: [],
  };

  const sorted = [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.label.localeCompare(b.label);
  });

  for (const item of sorted) {
    grouped[item.category].push(item);
  }

  return grouped;
}

export function nextPrepSortOrder(
  items: Pick<TrainingPrepItem, "sort_order">[],
): number {
  if (items.length === 0) return 10;
  return Math.max(...items.map((item) => item.sort_order)) + 10;
}

export function validateTrainingPrepLabel(value: string): string | null {
  const label = value.trim();
  if (!label) return "Add a checklist item name.";
  if (label.length > MAX_LABEL_LENGTH) {
    return `Keep the item name under ${MAX_LABEL_LENGTH} characters.`;
  }
  return null;
}

export function normalizeTrainingPrepNotes(
  value: string | null | undefined,
): string | null {
  const notes = value?.trim() ?? "";
  if (!notes) return null;
  return notes.slice(0, MAX_NOTES_LENGTH);
}

function rowsFromDefaults(
  programId: string,
  defaults: readonly DefaultTrainingPrepItem[],
) {
  return defaults.map((item) => ({
    id: crypto.randomUUID(),
    program_id: programId,
    item_key: item.key,
    category: item.category,
    label: item.label,
    is_done: false,
    notes: null,
    sort_order: item.sort_order,
  }));
}

export async function getTrainingPrepItems(
  programId: string,
): Promise<TrainingPrepItem[]> {
  const { data, error } = await supabase
    .from("training_prep_item")
    .select("*")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error retrieving training prep items:", error);
    throw error;
  }

  return (data ?? []) as TrainingPrepItem[];
}

export async function insertMissingDefaultTrainingPrepItems(
  programId: string,
  existingKeys: Iterable<string | null | undefined>,
): Promise<number> {
  const missing = missingDefaultTrainingPrepItems(existingKeys);
  if (missing.length === 0) return 0;

  const { error } = await supabase
    .from("training_prep_item")
    .insert(rowsFromDefaults(programId, missing));

  if (error) {
    console.error("Error inserting training prep items:", error);
    throw error;
  }

  return missing.length;
}

export async function seedDefaultTrainingPrepItems(
  programId: string,
): Promise<number> {
  return insertMissingDefaultTrainingPrepItems(programId, []);
}
