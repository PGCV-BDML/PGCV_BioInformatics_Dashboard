import { createClient } from "@supabase/supabase-js";
import type { TaskCategory } from "@/types/database";

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
  | "task_tag"
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
export async function getRowsFromDB<T = any>(table: TableNames): Promise<T[]> {
  const { data: rows, error: fetchError } = await supabase
    .from(table)
    .select("*");

  if (fetchError) {
    console.error(`Error retrieving ${table} data:`, fetchError);
    throw fetchError;
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

/** Load all task_tag rows grouped by task_id. */
export async function getTaskCategoriesByTaskId(): Promise<
  Map<string, TaskCategory[]>
> {
  const { data, error } = await supabase.from("task_tag").select("task_id, category");
  if (error) {
    console.error("Error retrieving task tags:", error);
    throw error;
  }

  const map = new Map<string, TaskCategory[]>();
  for (const row of data ?? []) {
    const taskId = row.task_id as string;
    const category = row.category as TaskCategory;
    const list = map.get(taskId) ?? [];
    list.push(category);
    map.set(taskId, list);
  }
  return map;
}

/** Replace all categories for a task (delete + insert). */
export async function replaceTaskCategories(
  taskId: string,
  categories: TaskCategory[],
) {
  const { error: deleteError } = await supabase
    .from("task_tag")
    .delete()
    .eq("task_id", taskId);

  if (deleteError) {
    console.error("Error clearing task tags:", deleteError);
    throw deleteError;
  }

  const unique = Array.from(new Set(categories));
  if (unique.length === 0) return;

  const { error: insertError } = await supabase.from("task_tag").insert(
    unique.map((category) => ({ task_id: taskId, category })),
  );

  if (insertError) {
    console.error("Error inserting task tags:", insertError);
    throw insertError;
  }
}
