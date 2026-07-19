import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCurrentUser() {
  // supabase.auth.getUser() is async; getSession() reads the local cache synchronously
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

//Get all user rows from database
export async function getUsersFromDB(chosenRoles: string[]) {
  const roleValues = ["team_lead", "team_member", "intern", "trainee"]

  const isValid = chosenRoles.every(role => roleValues.includes(role));

  if (!isValid || chosenRoles.length === 0) {
    console.error("Error: One or more invalid roles provided");
    return [];
  }

  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .in("role", chosenRoles)

  if (fetchError) {
    console.error("Error retrieving data:", fetchError);
    throw fetchError;
  }

  return users;
}

type TableNames =
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
  | "task";

export async function getNameIdFromDB(table: TableNames) {
  const { data: users, error: fetchError } = await supabase
    .from(table)
    .select("id,name")

  if (fetchError) {
    console.error("Error retrieving data:", fetchError);
    throw fetchError;
  }

  return users;
}

// Projects and Collab function =========================================================
//Get all collab rows from database

export async function getRowsFromDB(table: TableNames) {
  const { data: rows, error: fetchError } = await supabase
    .from(table)
    .select("*")

  if (fetchError) {
    console.error(`Error retrieving ${table} data:`, fetchError);
    throw fetchError;
  }

  return rows ?? [];
}

//For Updating Public.Collab table
export async function saveDataToDB(table: TableNames, uid: string, data: any,) {
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
      .update(data)
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
      .upsert({ id: uid, ...data })
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
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)

  if (error) {
    console.error(`Error deleting ${table} data:`, error);
    throw error;
  }
}