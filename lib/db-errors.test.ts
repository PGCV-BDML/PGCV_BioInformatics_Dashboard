import { describe, expect, it } from "vitest";
import {
  describeDeleteError,
  describeSaveError,
  isForeignKeyViolation,
  referencingTableFromError,
} from "./db-errors";

/** Shape PostgREST returns for a blocked delete. */
const fkError = {
  code: "23503",
  message:
    'update or delete on table "project" violates foreign key constraint "analysis_project_id_fkey" on table "analysis"',
  details:
    'Key (id)=(0f2b1c4e-1111-2222-3333-444455556666) is still referenced from table "analysis".',
};

describe("referencingTableFromError", () => {
  it("pulls the blocking table out of the detail line", () => {
    expect(referencingTableFromError(fkError)).toBe("analysis");
  });

  it("returns null for unrelated errors", () => {
    expect(referencingTableFromError({ code: "42501", message: "denied" })).toBeNull();
    expect(referencingTableFromError(null)).toBeNull();
    expect(referencingTableFromError("boom")).toBeNull();
  });
});

describe("isForeignKeyViolation", () => {
  it("detects the SQLSTATE", () => {
    expect(isForeignKeyViolation(fkError)).toBe(true);
  });

  it("falls back to the detail text when the code is missing", () => {
    expect(isForeignKeyViolation({ details: fkError.details })).toBe(true);
  });

  it("is false for other failures", () => {
    expect(isForeignKeyViolation({ code: "42501", message: "denied" })).toBe(false);
  });
});

describe("describeDeleteError", () => {
  it("names the records that are blocking the delete", () => {
    const message = describeDeleteError(fkError, "project");
    expect(message).toContain("sequence analyses");
    expect(message).toContain("Remove or reassign");
  });

  it("stays generic when the blocking table cannot be parsed", () => {
    const message = describeDeleteError({ code: "23503" }, "project");
    expect(message).toContain("other records still reference it");
  });

  it("passes through other Postgres messages", () => {
    const message = describeDeleteError(
      { code: "42501", message: "permission denied for table project" },
      "project",
    );
    expect(message).toContain("permission denied for table project");
  });

  it("falls back when the error is not a Postgres error at all", () => {
    expect(describeDeleteError(new Error(""), "project")).toBe(
      "Failed to delete this project.",
    );
  });

  it("singularizes irregular table labels correctly", () => {
    expect(describeDeleteError(new Error(""), "analysis")).toBe(
      "Failed to delete this sequence analysis.",
    );
    expect(describeDeleteError(new Error(""), "service")).toBe(
      "Failed to delete this service.",
    );
    expect(describeDeleteError(new Error(""), "incident_report")).toBe(
      "Failed to delete this incident report.",
    );
    expect(
      describeDeleteError(new Error(""), "analysis_service_report_version"),
    ).toBe("Failed to delete this service report version.");
  });
});

describe("describeSaveError", () => {
  it("explains empty incident title or description", () => {
    const message = describeSaveError(
      {
        message:
          'new row for relation "incident_report" violates check constraint "incident_report_title_chk"',
      },
      "incident_report",
    );
    expect(message).toContain("title and description are required");
  });

  it("points at a missing migration when the table is not in the schema cache", () => {
    const message = describeSaveError(
      {
        message:
          "Could not find the table 'public.service_report_generator' in the schema cache",
      },
      "service_report_generator",
    );
    expect(message).toContain("apply the latest Supabase migration");
  });

  it("explains a point-person column restriction", () => {
    const message = describeSaveError(
      { message: "Point person may only update status and follow-up notes" },
      "incident_report",
    );
    expect(message).toContain("status and follow-up notes");
  });
});
