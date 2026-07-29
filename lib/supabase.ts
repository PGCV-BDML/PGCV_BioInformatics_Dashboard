import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL or Anon Key is missing from environment variables.",
  );
}

export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "dummy-key",
);

export async function getCurrentUser() {
  // supabase.auth.getUser() is async; getSession() reads the local cache synchronously
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

//Get all user rows from database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUsersFromDB<T = any>(
  chosenRoles: string[],
): Promise<T[]> {
  const roleValues = ["team_lead", "team_member", "intern", "trainee"];

  const isValid = chosenRoles.every((role) => roleValues.includes(role));

  if (!isValid || chosenRoles.length === 0) {
    console.error("Error: One or more invalid roles provided");
    return [];
  }

  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .in("role", chosenRoles);

  if (fetchError) {
    console.error("Error retrieving data:", fetchError);
    throw fetchError;
  }

  return (users ?? []) as T[];
}

export type TableNames =
  | "collaboration"
  | "project"
  | "client"
  | "service"
  | "analysis"
  | "sample"
  | "service_report"
  | "training_program"
  | "training_session"
  | "module"
  | "onboarding_document"
  | "assessment"
  | "assessment_response"
  | "certificate"
  | "task"
  | "users";

export async function getNameIdFromDB<T = { id: string; name: string }>(
  table: TableNames,
): Promise<T[]> {
  const { data: users, error: fetchError } = await supabase
    .from(table)
    .select("id,name");

  if (fetchError) {
    console.error("Error retrieving data:", fetchError);
    throw fetchError;
  }

  return (users ?? []) as T[];
}

// Projects and Collab function =========================================================
//Get all collab rows from database

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DEFAULT_PROJECT_FALLBACK = [
  {
    id: "fallback-project-1",
    project_id: "P-0001",
    name: "Ocean Microbiome Survey",
    client_id: "fallback-client-1",
    service_id: "fallback-service-1",
    status: "ongoing",
    lead_user_id: "fallback-user-1",
    start_date: "2026-06-01",
    target_delivery_date: "2026-08-30",
    repository_link: "https://github.com/example/ocean-microbiome",
  },
  {
    id: "fallback-project-2",
    project_id: "P-0002",
    name: "Rice Pathogen Genomics",
    client_id: "fallback-client-2",
    service_id: "fallback-service-2",
    status: "for_approval",
    lead_user_id: "fallback-user-2",
    start_date: "2026-05-15",
    target_delivery_date: "2026-07-31",
    repository_link: "https://github.com/example/rice-pathogen",
  },
] as const;

export async function getRowsFromDB<T = any>(table: TableNames): Promise<T[]> {
  const { data: rows, error: fetchError } = await supabase
    .from(table)
    .select("*");

  if (fetchError) {
    console.error(`Error retrieving ${table} data:`, fetchError);
    throw fetchError;
  }

  if (table === "project" && (!rows || rows.length === 0)) {
    console.warn(
      "No rows returned for project table; using fallback demo data.",
    );
    return DEFAULT_PROJECT_FALLBACK as T[];
  }

  return (rows ?? []) as T[];
}

//For Updating Public.Collab table
export async function saveDataToDB<
  T extends Record<string, unknown> = Record<string, unknown>,
>(table: TableNames, uid: string, data: Partial<T>) {
  // Check if the row already exists
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (fetchError) {
    console.error("Error retrieving data:", fetchError);
    throw fetchError;
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    const err = new Error(
      `saveDataToDB: payload for table "${table}" must be a plain object, got ${Array.isArray(data) ? "array" : typeof data}`,
    );
    console.error(err.message);
    throw err;
  }

  if (existing) {
    // Modify an existing row
    const { data: updated, error } = await supabase
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(data as any)
      .eq("id", uid)
      .select()
      .single();

    if (error) {
      console.error("Error saving existing data:", error);
      throw error;
    }

    return updated;
  } else {
    // Add new row data
    const { data: inserted, error } = await supabase
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ id: uid, ...(data as any) })
      .select()
      .single();

    if (error) {
      console.error("Error saving new data:", error);
      throw error;
    }

    return inserted;
  }
}

export async function deleteDataFromDB(table: TableNames, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    console.error(`Error deleting ${table} data:`, error);
    throw error;
  }
}
