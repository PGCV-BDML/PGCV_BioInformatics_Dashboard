import type { User } from "@/types/database";
import { ALL_USER_ROLES } from "@/lib/portal";
import { getUsersFromDB, supabase } from "@/lib/supabase";

/** id → display name for every user row the current role can read. */
export async function loadUserNameMap(
  extraIds: Array<string | null | undefined> = [],
): Promise<Map<string, string>> {
  const users = await getUsersFromDB<Pick<User, "id" | "name">>(ALL_USER_ROLES);
  const map = new Map<string, string>();
  for (const user of users) map.set(user.id, user.name);

  const missing = [
    ...new Set(
      extraIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && !map.has(id),
      ),
    ),
  ];
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
