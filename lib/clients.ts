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
  /** Some live / imported tables used `email` instead of `email_address`. */
  email?: string | null;
  sex?: string | null;
  mobile_number?: string | null;
  affiliation?: string | null;
  affiliation_address?: string | null;
  designation?: string | null;
  contact_info?: string | null;
  notes?: string | null;
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

export function formFromClientRecord(client: ClientRecord): ClientFormState {
  return {
    clientId: client.clientId,
    clientName: client.clientName,
    projectId: client.projectId,
    emailAddress: client.emailAddress,
    affiliation: client.affiliation,
    designation: client.designation,
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

/**
 * Older client rows predates `email_address`. The address may live in
 * `contact_info` ("email | affiliation"), a column named `email`, or notes.
 * Only values that look like an address are used, so names/institutions
 * packed into `contact_info` never appear under Email.
 */
export function clientEmailFromRow(row: SupabaseClientRow): string {
  for (const value of [
    row.email_address,
    row.email,
    row.contact_info,
    row.notes,
  ]) {
    const extracted = extractEmailAddress(value);
    if (extracted) return extracted;
  }
  return "";
}

/** Core insert stores `Project ID: …` in legacy `notes` when `project_id` may be missing. */
const PROJECT_ID_IN_NOTES = /Project ID:\s*(.+)/i;

export function projectIdFromNotes(value: string | null | undefined): string {
  const match = (value ?? "").match(PROJECT_ID_IN_NOTES);
  return match?.[1]?.trim() ?? "";
}

export function mapClientRowToRecord(row: SupabaseClientRow): ClientRecord {
  return {
    id: row.id,
    createdAt: row.created_at ?? new Date().toISOString(),
    clientId: row.client_id ?? "",
    clientName: row.name ?? "",
    projectId: row.project_id?.trim() || projectIdFromNotes(row.notes),
    emailAddress: clientEmailFromRow(row),
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

const CLIENT_ID_SEQUENCE = /^CL-(\d{4})-(\d+)$/i;

export function parseGeneratedClientId(
  raw: string,
): { year: number; sequence: number } | null {
  const match = raw.trim().match(CLIENT_ID_SEQUENCE);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** Ascending by year, then sequence. Non-standard IDs sort first in asc (last in desc). */
export function compareClientIds(a: string, b: string): number {
  const pa = parseGeneratedClientId(a);
  const pb = parseGeneratedClientId(b);
  if (pa && pb) {
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.sequence - pb.sequence;
  }
  if (pa && !pb) return 1;
  if (!pa && pb) return -1;
  return a.toLowerCase().localeCompare(b.toLowerCase());
}

/** Next `CL-YYYY-NNN` for the current year, based on IDs already loaded. */
export function nextGeneratedClientId(
  existingIds: string[],
  now = new Date(),
): string {
  const year = now.getFullYear();
  let max = 0;

  for (const raw of existingIds) {
    const parsed = parseGeneratedClientId(raw);
    if (!parsed || parsed.year !== year) continue;
    max = Math.max(max, parsed.sequence);
  }

  return `CL-${year}-${String(max + 1).padStart(3, "0")}`;
}

function trimClientForm(form: ClientFormState) {
  return {
    clientId: form.clientId.trim(),
    clientName: form.clientName.trim(),
    projectId: form.projectId.trim(),
    emailAddress: form.emailAddress.trim(),
    affiliation: form.affiliation.trim(),
    designation: form.designation.trim(),
  };
}

function packedContactInfo(email: string, affiliation: string, name: string) {
  return [email, affiliation].filter(Boolean).join(" | ") || name;
}

/**
 * Original `public.client` columns only (`name`, `affiliation`,
 * `contact_info`, `client_id`, optional `notes`). Expanded profile
 * fields are applied afterwards so a missing `email_address` column
 * cannot block the insert.
 */
export function buildCoreClientInsert(
  rowId: string,
  form: ClientFormState,
  existingClientIds: string[],
): Record<string, unknown> {
  const trimmed = trimClientForm(form);
  const clientId =
    trimmed.clientId || nextGeneratedClientId(existingClientIds);

  return {
    id: rowId,
    client_id: clientId,
    name: trimmed.clientName,
    affiliation: trimmed.affiliation,
    contact_info: packedContactInfo(
      trimmed.emailAddress,
      trimmed.affiliation,
      trimmed.clientName,
    ),
    notes: trimmed.projectId ? `Project ID: ${trimmed.projectId}` : null,
  };
}

/** Newer profile columns that may be absent on a drifted live database. */
export function buildClientProfilePatch(
  form: ClientFormState,
): Record<string, unknown> {
  const trimmed = trimClientForm(form);
  const patch: Record<string, unknown> = {};
  if (trimmed.projectId) patch.project_id = trimmed.projectId;
  if (trimmed.emailAddress) patch.email_address = trimmed.emailAddress;
  if (trimmed.designation) patch.designation = trimmed.designation;
  return patch;
}

/**
 * Full update payload. Empty optional fields are sent as `null` so an
 * edit can clear Project ID / email / designation. `notes` stays in
 * sync for databases that never grew a `project_id` column.
 */
export function buildClientUpdatePayload(
  form: ClientFormState,
  current: Pick<ClientRecord, "clientId">,
): Record<string, unknown> {
  const trimmed = trimClientForm(form);
  const clientId = trimmed.clientId || current.clientId.trim();

  return {
    client_id: clientId,
    name: trimmed.clientName,
    affiliation: trimmed.affiliation,
    contact_info: packedContactInfo(
      trimmed.emailAddress,
      trimmed.affiliation,
      trimmed.clientName,
    ),
    project_id: trimmed.projectId || null,
    email_address: trimmed.emailAddress || null,
    designation: trimmed.designation || null,
    notes: trimmed.projectId ? `Project ID: ${trimmed.projectId}` : null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Payload for `public.client`.
 *
 * `name`, `affiliation`, and `contact_info` are NOT NULL. Empty optional
 * fields are omitted so we never send `null` into those required columns.
 */
export function buildClientPayload(form: ClientFormState): ClientWritePayload {
  const trimmed = trimClientForm(form);
  const payload: ClientWritePayload = {
    name: trimmed.clientName,
    affiliation: trimmed.affiliation,
    contact_info: packedContactInfo(
      trimmed.emailAddress,
      trimmed.affiliation,
      trimmed.clientName,
    ),
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

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") {
    return typeof error === "string" ? error : "";
  }
  const e = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  return [e.message, e.details, e.hint].filter(Boolean).join(" ");
}

/**
 * PostgREST PGRST204 / Postgres 42703: column is not in the schema cache
 * (or the table). Returns the column name when it can be parsed.
 */
export function unknownColumnFromError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { code?: string };
  const text = errorText(error);

  const pgrst = text.match(/Could not find the '([^']+)' column/i);
  if (pgrst) return pgrst[1] ?? null;

  const pg = text.match(
    /column "([^"]+)"(?: of relation "[^"]+")? does not exist/i,
  );
  if (pg) return pg[1] ?? null;

  if (e.code === "PGRST204" || e.code === "42703") {
    const quoted = text.match(/'([^']+)'/) || text.match(/"([^"]+)"/);
    return quoted?.[1] ?? null;
  }

  return null;
}

export function isUniqueClientIdError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string };
  const text = errorText(error).toLowerCase();
  if (e.code === "23505" && text.includes("client_id")) return true;
  return text.includes("duplicate key") && text.includes("client_id");
}

const CORE_REQUIRED_COLUMNS = new Set([
  "id",
  "client_id",
  "name",
  "affiliation",
  "contact_info",
]);

export interface ClientWriter {
  insert: (row: Record<string, unknown>) => Promise<SupabaseClientRow>;
  update: (
    id: string,
    patch: Record<string, unknown>,
  ) => Promise<SupabaseClientRow | null>;
}

function hasOwnColumn(
  payload: Record<string, unknown>,
  column: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(payload, column);
}

function overlayWrittenClientFields(
  row: SupabaseClientRow,
  written: Record<string, unknown>,
): SupabaseClientRow {
  const next: SupabaseClientRow = { ...row };

  if (!next.client_id && typeof written.client_id === "string") {
    next.client_id = written.client_id;
  }
  if (!next.project_id && typeof written.project_id === "string") {
    next.project_id = written.project_id;
  }
  if (!next.email_address && typeof written.email_address === "string") {
    next.email_address = written.email_address;
  }
  if (!next.designation && typeof written.designation === "string") {
    next.designation = written.designation;
  }
  if (!next.notes && typeof written.notes === "string") {
    next.notes = written.notes;
  }
  if (!next.project_id) {
    next.project_id = projectIdFromNotes(next.notes) || null;
  }

  return next;
}

function remainingProfilePatch(
  form: ClientFormState,
  saved: SupabaseClientRow,
): Record<string, unknown> {
  const patch = buildClientProfilePatch(form);
  if (saved.project_id) delete patch.project_id;
  if (saved.email_address) delete patch.email_address;
  if (saved.designation) delete patch.designation;
  return patch;
}

/**
 * Insert core columns plus any filled profile fields, stripping unknown
 * optional columns (PGRST204) so a missing `email_address` cannot drop
 * `project_id` / `designation`. Then best-effort patch whatever is left.
 */
export async function saveNewClient(
  form: ClientFormState,
  existingClientIds: string[],
  db: ClientWriter,
): Promise<SupabaseClientRow> {
  const rowId = crypto.randomUUID();
  let payload: Record<string, unknown> = {
    ...buildCoreClientInsert(rowId, form, existingClientIds),
    ...buildClientProfilePatch(form),
  };
  let saved: SupabaseClientRow | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      saved = await db.insert(payload);
      break;
    } catch (error) {
      lastError = error;
      const column = unknownColumnFromError(error);
      if (
        column &&
        hasOwnColumn(payload, column) &&
        !CORE_REQUIRED_COLUMNS.has(column)
      ) {
        const next = { ...payload };
        delete next[column];
        payload = next;
        continue;
      }
      if (
        isUniqueClientIdError(error) &&
        !form.clientId.trim() &&
        typeof payload.client_id === "string"
      ) {
        payload = {
          ...payload,
          client_id: nextGeneratedClientId([
            ...existingClientIds,
            payload.client_id,
          ]),
        };
        continue;
      }
      throw error;
    }
  }

  if (!saved) throw lastError;

  saved = overlayWrittenClientFields(saved, payload);

  let patch = remainingProfilePatch(form, saved);
  if (Object.keys(patch).length === 0) return saved;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const patched = await db.update(saved.id, patch);
      return overlayWrittenClientFields(
        { ...saved, ...(patched ?? {}) },
        patch,
      );
    } catch (error) {
      const column = unknownColumnFromError(error);
      if (column && hasOwnColumn(patch, column)) {
        const next = { ...patch };
        delete next[column];
        patch = next;
        if (Object.keys(patch).length === 0) return saved;
        continue;
      }
      return overlayWrittenClientFields(saved, payload);
    }
  }

  return saved;
}

const UPDATE_REQUIRED_COLUMNS = new Set([
  "client_id",
  "name",
  "affiliation",
  "contact_info",
]);

/**
 * Update an existing client, stripping unknown optional columns so a
 * missing `email_address` cannot block Project ID / designation.
 */
export async function saveExistingClient(
  id: string,
  form: ClientFormState,
  current: Pick<ClientRecord, "clientId">,
  db: Pick<ClientWriter, "update">,
): Promise<SupabaseClientRow> {
  let payload = buildClientUpdatePayload(form, current);
  let saved: SupabaseClientRow | null = null;
  let wrote = false;
  let lastError: unknown;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      saved = await db.update(id, payload);
      wrote = true;
      break;
    } catch (error) {
      lastError = error;
      const column = unknownColumnFromError(error);
      if (
        column &&
        hasOwnColumn(payload, column) &&
        !UPDATE_REQUIRED_COLUMNS.has(column)
      ) {
        const next = { ...payload };
        delete next[column];
        payload = next;
        continue;
      }
      throw error;
    }
  }

  if (!wrote) throw lastError;

  return overlayWrittenClientFields(
    { id, ...(saved ?? {}), ...payload } as SupabaseClientRow,
    payload,
  );
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
