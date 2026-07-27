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
