import type { User } from "@/types/database";
import { ALL_USER_ROLES } from "@/lib/portal";
import { getUsersFromDB, supabase } from "@/lib/supabase";

export type UserProfile = {
  name: string;
  email: string | null;
  institution: string | null;
};

function idsMissingFrom(
  known: { has: (id: string) => boolean },
  extraIds: Array<string | null | undefined>,
): string[] {
  return [
    ...new Set(
      extraIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && !known.has(id),
      ),
    ),
  ];
}

/** id → display name for every user row the current role can read. */
export async function loadUserNameMap(
  extraIds: Array<string | null | undefined> = [],
): Promise<Map<string, string>> {
  const users = await getUsersFromDB<Pick<User, "id" | "name">>(ALL_USER_ROLES);
  const map = new Map<string, string>();
  for (const user of users) map.set(user.id, user.name);

  const missing = idsMissingFrom(map, extraIds);
  if (missing.length === 0) return map;

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", missing);
  if (error) {
    console.error("Failed to load assigned user names:", error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id as string, row.name as string);
  }
  return map;
}

/** Name, email, and institution for response exports. */
export async function loadUserProfiles(
  extraIds: Array<string | null | undefined> = [],
): Promise<Map<string, UserProfile>> {
  const users = await getUsersFromDB<
    Pick<User, "id" | "name" | "email" | "institution">
  >(ALL_USER_ROLES);
  const map = new Map<string, UserProfile>();
  for (const user of users) {
    map.set(user.id, {
      name: user.name,
      email: user.email ?? null,
      institution: user.institution ?? null,
    });
  }

  const missing = idsMissingFrom(map, extraIds);
  if (missing.length === 0) return map;

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, institution")
    .in("id", missing);
  if (error) {
    console.error("Failed to load user profiles:", error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id as string, {
      name: row.name as string,
      email: (row.email as string | null) ?? null,
      institution: (row.institution as string | null) ?? null,
    });
  }
  return map;
}
