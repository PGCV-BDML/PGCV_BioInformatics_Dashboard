"use client";

import { useMemo } from "react";
import type { Project, User } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Internal types for the lightweight lookup objects                 */
/* ------------------------------------------------------------------ */
interface NamedItem {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export interface UseServiceLookupsParams {
  projects: Project[];
  clients: NamedItem[];
  services: NamedItem[];
  users: User[];
}

export interface UseServiceLookupsResult {
  projectMap: Map<string, { name: string; client: string }>;
  serviceMap: Map<string, string>;
  userMap: Map<string, string>;
}

/**
 * Builds lookup maps from raw DB arrays so the services page can quickly
 * resolve IDs to display names without inline map-construction logic.
 *
 * Previously this code was inlined inside services/page.tsx ~lines 107-121.
 */
export function useServiceLookups({
  projects,
  clients,
  services,
  users,
}: UseServiceLookupsParams): UseServiceLookupsResult {
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; client: string }>();
    for (const p of projects) {
      const client = clients.find((c) => c.id === p.client_id);
      map.set(p.id, { name: p.name, client: client?.name ?? "—" });
    }
    return map;
  }, [projects, clients]);

  const serviceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) {
      map.set(s.id, s.name);
    }
    return map;
  }, [services]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users as User[]) {
      map.set(u.id, u.name);
    }
    return map;
  }, [users]);

  return { projectMap, serviceMap, userMap };
}
