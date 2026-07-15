import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getCurrentUser() {
  // supabase.auth.getUser() is async, but getSession() is synchronous from cache
  return supabase.auth.getSession().then(({ data }) => data.session?.user ?? null);
}

//Get all collab rows from database
export async function getCollabFromDB() {
  const { data: collabs, error: fetchError } = await supabase
    .from("collaboration")
    .select("*")

  if (fetchError) {
    console.error("Error checking user data:", fetchError);
    throw fetchError;
  }

  return collabs;
}

//Get all user rows from database
export async function getUsersFromDB() {
  // Check if the row already exists
  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("*")

  if (fetchError) {
    console.error("Error checking user data:", fetchError);
    throw fetchError;
  }

  return users;
}

//For Updating Public.Collab table
export async function saveCollabToDB(uid: string, data: any) {
  // Check if the row already exists
  const { data: existing, error: fetchError } = await supabase
    .from("collaboration")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (fetchError) {
    console.error("Error checking collab data:", fetchError);
    throw fetchError;
  }

  if (existing) {
    // Modify an existing row
    const { error } = await supabase
      .from("collaboration")
      .update(data)
      .eq("id", uid);

    if (error) {
      console.error("Error saving existing collab data:", error);
      throw error;
    }
  } else {
    // Add new row data
    const { error } = await supabase
      .from("collaboration")
      .upsert({ ...data });

    if (error) {
      console.error("Error saving new collab data:", error);
      throw error;
    }
  }

  return { uid, ...data };
}