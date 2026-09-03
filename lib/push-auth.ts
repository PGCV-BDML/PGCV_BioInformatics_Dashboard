import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
}

export async function getUserFromAuthorizationHeader(
  header: string | null,
): Promise<{ user: User; accessToken: string } | null> {
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const accessToken = header.slice("bearer ".length).trim();
  if (!accessToken) return null;

  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { user: data.user, accessToken };
}

export function createUserSupabaseClient(accessToken: string) {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createAnonSupabaseClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
