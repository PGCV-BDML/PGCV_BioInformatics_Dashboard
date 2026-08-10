import type { TableNames } from "@/lib/supabase";

/** Postgres foreign-key violation. */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * How each table reads in a sentence aimed at a user, not a DBA.
 * Both forms are spelled out — "analysis"/"analyses" and
 * "service"/"services" defeat any suffix-stripping rule.
 */
const TABLE_LABELS: Partial<
  Record<TableNames | string, { one: string; many: string }>
> = {
  analysis: { one: "sequence analysis", many: "sequence analyses" },
  sample: { one: "sample", many: "samples" },
  task: { one: "task", many: "tasks" },
  service_report: { one: "service report", many: "service reports" },
  project: { one: "project", many: "projects" },
  client: { one: "client", many: "clients" },
  service: { one: "service", many: "services" },
  collaboration: { one: "collaboration", many: "collaborations" },
  repository: { one: "repository link", many: "repository links" },
  training_program: { one: "training program", many: "training programs" },
  training_session: { one: "training session", many: "training sessions" },
  program_enrollment: { one: "enrollment", many: "enrollments" },
  module: { one: "module", many: "modules" },
  assessment: { one: "assessment", many: "assessments" },
  assessment_response: { one: "assessment response", many: "assessment responses" },
  certificate: { one: "certificate", many: "certificates" },
  onboarding_document: { one: "onboarding document", many: "onboarding documents" },
  conversation: { one: "conversation", many: "conversations" },
  message: { one: "message", many: "messages" },
  task_tag: { one: "task tag", many: "task tags" },
  user_presence: { one: "presence record", many: "presence records" },
  user_absence: { one: "absence day", many: "absence days" },
  users: { one: "user", many: "users" },
};

function singular(table: string): string {
  return TABLE_LABELS[table]?.one ?? `${table} record`;
}

function plural(table: string): string {
  return TABLE_LABELS[table]?.many ?? `${table} records`;
}

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
};

function asPostgrestError(error: unknown): PostgrestLikeError | null {
  if (!error || typeof error !== "object") return null;
  return error as PostgrestLikeError;
}

/**
 * Pull the blocking table out of a 23503.
 *
 * Postgres phrases the detail as:
 *   Key (id)=(…) is still referenced from table "analysis".
 */
export function referencingTableFromError(error: unknown): string | null {
  const pgError = asPostgrestError(error);
  if (!pgError) return null;

  const haystack = `${pgError.details ?? ""} ${pgError.message ?? ""}`;
  const match = haystack.match(/still referenced from table "([^"]+)"/i);
  return match?.[1] ?? null;
}

export function isForeignKeyViolation(error: unknown): boolean {
  const pgError = asPostgrestError(error);
  if (!pgError) return false;
  if (pgError.code === FOREIGN_KEY_VIOLATION) return true;
  // PostgREST does not always forward the SQLSTATE.
  return referencingTableFromError(error) !== null;
}

/**
 * A delete error a user can act on.
 *
 * The common case by far is a foreign key: the record still has
 * dependent rows, and Postgres refuses rather than cascading. Saying
 * *which* rows turns a dead end into a next step.
 */
export function describeDeleteError(error: unknown, table: TableNames): string {
  const subject = singular(table);

  if (isForeignKeyViolation(error)) {
    const blocking = referencingTableFromError(error);
    if (blocking) {
      return `Cannot delete this ${subject}: it still has ${plural(blocking)} linked to it. Remove or reassign those first.`;
    }
    return `Cannot delete this ${subject}: other records still reference it. Remove or reassign those first.`;
  }

  const pgError = asPostgrestError(error);
  if (pgError?.message) {
    return `Failed to delete this ${subject}: ${pgError.message}`;
  }

  return `Failed to delete this ${subject}.`;
}

/**
 * A save/upsert error a user can act on.
 */
export function describeSaveError(error: unknown, table: TableNames): string {
  const subject = singular(table);
  const pgError = asPostgrestError(error);
  const message = pgError?.message ?? "";

  if (
    message.includes("task_category") ||
    message.includes("invalid input value for enum")
  ) {
    return `Failed to save ${subject}: a selected category is not available in the database yet. Apply the latest Supabase migration, then try again.`;
  }

  if (message.includes("invalid input syntax for type date")) {
    return `Failed to save ${subject}: the date is invalid. Please re-select the date.`;
  }

  if (message.includes("training_program_date_range_chk")) {
    return `Failed to save ${subject}: end date cannot be before start date.`;
  }

  if (message.includes("task_date_range_chk")) {
    return `Failed to save ${subject}: end date cannot be before start date.`;
  }

  if (message) {
    return `Failed to save ${subject}: ${message}`;
  }

  return `Failed to save ${subject}.`;
}
