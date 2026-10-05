import { supabase } from "@/lib/supabase";
import type { ModuleLibraryItem } from "@/lib/module-library";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to open training modules.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type ModuleCatalog = {
  /** False when GITHUB_MODULES_TOKEN isn't set on the server. */
  configured: boolean;
  modules: ModuleLibraryItem[];
};

export async function fetchModuleCatalog(): Promise<ModuleCatalog> {
  const response = await fetch("/api/training-modules/catalog", {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error("Couldn't load the module library from GitHub.");
  }
  return (await response.json()) as ModuleCatalog;
}

/** Short-lived viewer URL for a file in the bioinfo-modules repo. */
export async function getGithubModuleViewUrl(path: string): Promise<string> {
  const response = await fetch("/api/training-modules/link", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ path }),
  });
  const body = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  if (!response.ok || !body?.url) {
    throw new Error(body?.error ?? "Couldn't open this module.");
  }
  return body.url;
}
