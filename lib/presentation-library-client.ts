import { supabase } from "@/lib/supabase";
import type { PresentationLibraryItem } from "@/lib/presentation-library";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to open training presentations.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type PresentationCatalog = {
  /** False when neither presentations nor modules GitHub token is set. */
  configured: boolean;
  presentations: PresentationLibraryItem[];
};

export async function fetchPresentationCatalog(): Promise<PresentationCatalog> {
  const response = await fetch("/api/training-presentations/catalog", {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error("Couldn't load the presentation library from GitHub.");
  }
  return (await response.json()) as PresentationCatalog;
}

/** Short-lived viewer URL for a library presentation, by presentations.json id. */
export async function getGithubPresentationViewUrl(id: string): Promise<string> {
  const response = await fetch("/api/training-presentations/link", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ id }),
  });
  const body = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  if (!response.ok || !body?.url) {
    throw new Error(body?.error ?? "Couldn't open this presentation.");
  }
  return body.url;
}
