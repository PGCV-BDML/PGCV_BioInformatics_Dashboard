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

/**
 * `contact_info` is a legacy NOT NULL column that predates `email_address`.
 * `buildClientPayload` packs "email | affiliation" into it and falls back to
 * the client's name when both are blank, so using it verbatim as the email
 * puts names and institutions under the Email column. Recover an address if
 * one is in there; otherwise show nothing rather than the wrong field.
 */
const EMAIL_IN_TEXT = /[^\s|,;<>()]+@[^\s|,;<>()]+\.[a-z]{2,}/i;

export function extractEmailAddress(value: string | null | undefined): string {
  const match = (value ?? "").match(EMAIL_IN_TEXT);
  return match ? match[0] : "";
}

export function mapClientRowToRecord(row: SupabaseClientRow): ClientRecord {
  const email = row.email_address?.trim() ?? "";

  return {
    id: row.id,
    createdAt: row.created_at ?? new Date().toISOString(),
    clientId: row.client_id ?? "",
    clientName: row.name ?? "",
    projectId: row.project_id ?? "",
    emailAddress: email || extractEmailAddress(row.contact_info),
    affiliation: row.affiliation ?? "",
    designation: row.designation ?? "",
  };
}

export type ClientWritePayload = {
  name: string;
  affiliation: string;
  contact_info: string;
  updated_at: string;
  client_id?: string;
  project_id?: string;
  email_address?: string;
  designation?: string;
};

/**
 * Payload for `public.client`.
 *
 * `name`, `affiliation`, and `contact_info` are NOT NULL. Empty optional
 * fields are omitted so Postgres defaults apply (`client_id` is generated)
 * and we never send `null` into those required columns.
 *
 * `email_address` (and other expanded profile columns) may be missing from
 * a drifted live database. PostgREST rejects unknown columns with PGRST204
 * *before* RLS, which is why adding a client used to fail. Callers should
 * retry via `saveClientWithSchemaFallback`.
 */
export function buildClientPayload(form: ClientFormState): ClientWritePayload {
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

  const payload: ClientWritePayload = {
    name: trimmed.clientName,
    affiliation: trimmed.affiliation,
    contact_info: contactInfo || trimmed.clientName,
    updated_at: new Date().toISOString(),
  };

  if (trimmed.clientId) payload.client_id = trimmed.clientId;
  if (trimmed.projectId) payload.project_id = trimmed.projectId;
  if (trimmed.emailAddress) payload.email_address = trimmed.emailAddress;
  if (trimmed.designation) payload.designation = trimmed.designation;

  return payload;
}

/** Columns that existed on `public.client` before profile-field expansions. */
export function buildLegacyClientPayload(
  form: ClientFormState,
): Record<string, unknown> {
  const payload = buildClientPayload(form);
  const legacy = { ...payload };
  delete legacy.email_address;
  delete legacy.project_id;
  delete legacy.designation;

  const projectId = form.projectId.trim();
  return {
    ...legacy,
    notes: projectId ? `Project ID: ${projectId}` : null,
  };
}

/**
 * PostgREST PGRST204 / Postgres 42703: column is not in the schema cache
 * (or the table). Returns the column name when it can be parsed.
 */
export function unknownColumnFromError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { code?: string; message?: string; details?: string };
  const text = [e.message, e.details].filter(Boolean).join(" ");

  const pgrst = text.match(/Could not find the '([^']+)' column/i);
  if (pgrst) return pgrst[1];

  const pg = text.match(/column "([^"]+)"(?: of relation "[^"]+")? does not exist/i);
  if (pg) return pg[1];

  if (e.code === "PGRST204" || e.code === "42703") {
    const quoted = text.match(/'([^']+)'/) || text.match(/"([^"]+)"/);
    return quoted?.[1] ?? null;
  }

  return null;
}

/**
 * Insert/update a client, stripping columns PostgREST does not know about
 * and finally retrying with the original schema if needed.
 */
export async function saveClientWithSchemaFallback<T>(
  save: (payload: Record<string, unknown>) => Promise<T>,
  form: ClientFormState,
): Promise<T> {
  let payload: Record<string, unknown> = { ...buildClientPayload(form) };
  let usedLegacy = false;
  let lastError: unknown;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await save(payload);
    } catch (error) {
      lastError = error;
      const column = unknownColumnFromError(error);
      if (column && Object.prototype.hasOwnProperty.call(payload, column)) {
        const next = { ...payload };
        delete next[column];
        payload = next;
        continue;
      }
      if (!usedLegacy) {
        usedLegacy = true;
        payload = buildLegacyClientPayload(form);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
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
