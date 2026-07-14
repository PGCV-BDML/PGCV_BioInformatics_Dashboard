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

//For Updating Public.Users table
export async function saveUserDataToDB(uid: string, data: any) {
  // Check if the row already exists
  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (fetchError) {
    console.error("Error checking user data:", fetchError);
    throw fetchError;
  }

  if (existing) {
    // Row exists — only update the provided fields, don't touch email or other columns
    const { error } = await supabase
      .from("users")
      .update(data)
      .eq("id", uid);

    if (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  } else {
    // Row doesn't exist yet (e.g. trigger hasn't fired) — full insert
    const { error } = await supabase
      .from("users")
      .insert({ id: uid, ...data });

    if (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  }

  return { uid, ...data };
}