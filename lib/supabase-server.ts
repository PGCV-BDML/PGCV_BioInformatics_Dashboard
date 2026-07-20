import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Server Components.
 *
 * Reads the user's session from cookies (set by the browser client during
 * Google OAuth login) so that RLS-protected queries can be made server-side.
 *
 * `setAll` is intentionally a no-op: Server Components cannot set cookies.
 * Token refreshes that need to write cookies back must go through a Route
 * Handler or Server Function (see Phase 7.4+).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op in server components — cannot set cookies during rendering.
        },
      },
    },
  );
}

/**
 * Retrieves the currently authenticated user by verifying the session stored
 * in cookies against the Supabase API.
 *
 * Returns `null` when no valid session exists — never throws.
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
