export interface ClientFormState {
  clientId: string;
  clientName: string;
  projectId: string;
  emailAddress: string;
  affiliation: string;
  designation: string;
}

export interface ClientRecord extends ClientFormState {
  id: string;
  createdAt: string;
}

export interface SupabaseClientRow {
  id: string;
  client_id?: string | null;
  name?: string | null;
  project_id?: string | null;
  email_address?: string | null;
  sex?: string | null;
  mobile_number?: string | null;
  affiliation?: string | null;
  affiliation_address?: string | null;
  designation?: string | null;
  contact_info?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function createEmptyClientForm(): ClientFormState {
  return {
    clientId: "",
    clientName: "",
    projectId: "",
    emailAddress: "",
    affiliation: "",
    designation: "",
  };
}

export function createClientRecord(form: ClientFormState): ClientRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...form,
  };
}

export function mapClientRowToRecord(row: SupabaseClientRow): ClientRecord {
  const email = row.email_address?.trim() ?? "";

  return {
    id: row.id,
    createdAt: row.created_at ?? new Date().toISOString(),
    clientId: row.client_id ?? "",
    clientName: row.name ?? "",
    projectId: row.project_id ?? "",
    emailAddress: email || row.contact_info || "",
    affiliation: row.affiliation ?? "",
    designation: row.designation ?? "",
  };
}

export function buildClientPayload(form: ClientFormState) {
  const trimmed = {
    clientId: form.clientId.trim(),
    clientName: form.clientName.trim(),
    projectId: form.projectId.trim(),
    emailAddress: form.emailAddress.trim(),
    affiliation: form.affiliation.trim(),
    designation: form.designation.trim(),
  };

  const contactInfo = [trimmed.emailAddress, trimmed.affiliation]
    .filter(Boolean)
    .join(" | ");

  return {
    client_id: trimmed.clientId || null,
    name: trimmed.clientName || null,
    project_id: trimmed.projectId || null,
    email_address: trimmed.emailAddress || null,
    affiliation: trimmed.affiliation || null,
    designation: trimmed.designation || null,
    contact_info: contactInfo || trimmed.clientName || null,
    updated_at: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Soft match: analysis.external_client_id ↔ client.client_id         */
/* ------------------------------------------------------------------ */

const EMPTY_CLIENT_ID_TOKENS = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
]);

export type ClientMatchStatus = "matched" | "unmatched" | "empty";

export interface MatchedClientSummary {
  id: string;
  clientId: string;
  name: string;
  affiliation: string;
  emailAddress: string;
  designation: string;
}

export interface ExternalClientMatch {
  status: ClientMatchStatus;
  /** Normalized key that matched, when status is "matched". */
  matchedKey: string | null;
  client: MatchedClientSummary | null;
  /** Parsed external IDs (after normalize); empty when status is "empty". */
  parsedIds: string[];
}

/**
 * Normalize a Client ID for soft matching.
 * - Trims / uppercases
 * - Strips a leading `PGCV-` prefix (Excel drift)
 * - Returns null for blank / N/A-style placeholders
 */
export function normalizeClientIdKey(
  value: string | null | undefined,
): string | null {
  let raw = (value ?? "").trim();
  if (!raw) return null;

  raw = raw.replace(/^PGCV-/i, "").trim();
  const key = raw.toUpperCase();
  if (EMPTY_CLIENT_ID_TOKENS.has(key.toLowerCase())) return null;
  return key;
}

/** Split comma/semicolon multi-ID Excel cells into normalized keys. */
export function parseExternalClientIds(
  value: string | null | undefined,
): string[] {
  const raw = (value ?? "").trim();
  if (!raw) return [];

  const parts = raw.split(/[,;]+/);
  const keys: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const key = normalizeClientIdKey(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  return keys;
}

export function toMatchedClientSummary(
  client: Pick<
    ClientRecord,
    | "id"
    | "clientId"
    | "clientName"
    | "affiliation"
    | "emailAddress"
    | "designation"
  >,
): MatchedClientSummary {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.clientName,
    affiliation: client.affiliation,
    emailAddress: client.emailAddress,
    designation: client.designation,
  };
}

/** Map normalized `client.client_id` → client summary. First wins on duplicates. */
export function buildClientIdLookup(
  clients: Array<
    Pick<
      ClientRecord,
      | "id"
      | "clientId"
      | "clientName"
      | "affiliation"
      | "emailAddress"
      | "designation"
    >
  >,
): Map<string, MatchedClientSummary> {
  const map = new Map<string, MatchedClientSummary>();

  for (const client of clients) {
    const key = normalizeClientIdKey(client.clientId);
    if (!key || map.has(key)) continue;
    map.set(key, toMatchedClientSummary(client));
  }

  return map;
}

/**
 * Soft-match tracker `external_client_id` against Clients module IDs.
 * For multi-ID cells, returns the first successful match.
 */
export function matchClientByExternalId(
  externalClientId: string | null | undefined,
  lookup: Map<string, MatchedClientSummary>,
): ExternalClientMatch {
  const parsedIds = parseExternalClientIds(externalClientId);
  if (parsedIds.length === 0) {
    return { status: "empty", matchedKey: null, client: null, parsedIds };
  }

  for (const key of parsedIds) {
    const client = lookup.get(key);
    if (client) {
      return { status: "matched", matchedKey: key, client, parsedIds };
    }
  }

  return { status: "unmatched", matchedKey: null, client: null, parsedIds };
}
