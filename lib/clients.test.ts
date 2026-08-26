import { describe, expect, it } from "vitest";
import {
  buildClientIdLookup,
  buildClientPayload,
  buildClientProfilePatch,
  buildCoreClientInsert,
  buildLegacyClientPayload,
  extractEmailAddress,
  mapClientRowToRecord,
  matchClientByExternalId,
  nextGeneratedClientId,
  normalizeClientIdKey,
  parseExternalClientIds,
  saveNewClient,
  unknownColumnFromError,
  type ClientFormState,
  type ClientRecord,
} from "./clients";

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "uuid-1",
    createdAt: "2024-01-01T00:00:00.000Z",
    clientId: "CL-2024-128",
    clientName: "Ada Lovelace",
    projectId: "P-1",
    emailAddress: "ada@example.org",
    affiliation: "PGCV",
    designation: "PI",
    ...overrides,
  };
}

describe("extractEmailAddress", () => {
  it("pulls the address out of a packed contact_info value", () => {
    expect(extractEmailAddress("ada@example.org | PGCV")).toBe(
      "ada@example.org",
    );
  });

  it("returns empty for values that hold no address", () => {
    expect(extractEmailAddress("Ada Lovelace")).toBe("");
    expect(extractEmailAddress("PGC Visayas")).toBe("");
    expect(extractEmailAddress(null)).toBe("");
  });
});

describe("mapClientRowToRecord", () => {
  it("prefers email_address", () => {
    const record = mapClientRowToRecord({
      id: "uuid-1",
      email_address: "ada@example.org",
      contact_info: "someone.else@example.org | PGCV",
    });
    expect(record.emailAddress).toBe("ada@example.org");
  });

  it("recovers a legacy address from contact_info", () => {
    const record = mapClientRowToRecord({
      id: "uuid-1",
      contact_info: "ada@example.org | PGCV",
    });
    expect(record.emailAddress).toBe("ada@example.org");
  });

  it("never shows a name or affiliation under Email", () => {
    // buildClientPayload falls back to the client's name for contact_info,
    // which previously surfaced in the Email column.
    expect(
      mapClientRowToRecord({
        id: "uuid-1",
        name: "Ada Lovelace",
        contact_info: "Ada Lovelace",
      }).emailAddress,
    ).toBe("");

    expect(
      mapClientRowToRecord({
        id: "uuid-2",
        contact_info: "PGC Visayas",
      }).emailAddress,
    ).toBe("");
  });
});

function makeForm(overrides: Partial<ClientFormState> = {}): ClientFormState {
  return {
    clientId: "CL-2024-128",
    clientName: "Ada Lovelace",
    projectId: "P-1",
    emailAddress: "ada@example.org",
    affiliation: "PGCV",
    designation: "PI",
    ...overrides,
  };
}

describe("buildClientPayload", () => {
  it("sends required columns as non-null strings", () => {
    const payload = buildClientPayload(makeForm());
    expect(payload.name).toBe("Ada Lovelace");
    expect(payload.affiliation).toBe("PGCV");
    expect(payload.contact_info).toBe("ada@example.org | PGCV");
    expect(payload.email_address).toBe("ada@example.org");
    expect(payload.client_id).toBe("CL-2024-128");
  });

  it("omits empty optional fields so NOT NULL defaults still apply", () => {
    const payload = buildClientPayload(
      makeForm({
        clientId: "  ",
        projectId: "",
        emailAddress: "",
        designation: "",
      }),
    );
    expect(payload).not.toHaveProperty("client_id");
    expect(payload).not.toHaveProperty("email_address");
    expect(payload).not.toHaveProperty("project_id");
    expect(payload).not.toHaveProperty("designation");
    expect(payload.contact_info).toBe("PGCV");
  });
});

describe("buildLegacyClientPayload", () => {
  it("drops expanded profile columns that may be missing on live DBs", () => {
    const payload = buildLegacyClientPayload(makeForm());
    expect(payload).not.toHaveProperty("email_address");
    expect(payload).not.toHaveProperty("project_id");
    expect(payload).not.toHaveProperty("designation");
    expect(payload.name).toBe("Ada Lovelace");
    expect(payload.notes).toBe("Project ID: P-1");
  });
});

describe("unknownColumnFromError", () => {
  it("parses PostgREST schema-cache errors", () => {
    expect(
      unknownColumnFromError({
        code: "PGRST204",
        message:
          "Could not find the 'email_address' column of 'client' in the schema cache",
      }),
    ).toBe("email_address");
  });

  it("parses Postgres undefined-column errors", () => {
    expect(
      unknownColumnFromError({
        code: "42703",
        message: 'column "designation" of relation "client" does not exist',
      }),
    ).toBe("designation");
  });

  it("returns null for unrelated errors", () => {
    expect(unknownColumnFromError(new Error("RLS denied"))).toBeNull();
    expect(unknownColumnFromError(null)).toBeNull();
  });
});

describe("nextGeneratedClientId", () => {
  it("starts at 001 for the current year when none exist", () => {
    expect(nextGeneratedClientId([], new Date("2026-08-26"))).toBe(
      "CL-2026-001",
    );
  });

  it("increments the highest ID for the current year", () => {
    expect(
      nextGeneratedClientId(
        ["CL-2024-999", "CL-2026-7", "CL-2026-012"],
        new Date("2026-08-26"),
      ),
    ).toBe("CL-2026-013");
  });
});

describe("buildCoreClientInsert", () => {
  it("writes only original schema columns and a concrete client_id", () => {
    const row = buildCoreClientInsert("uuid-1", makeForm(), []);
    expect(row).toEqual({
      id: "uuid-1",
      client_id: "CL-2024-128",
      name: "Ada Lovelace",
      affiliation: "PGCV",
      contact_info: "ada@example.org | PGCV",
      notes: "Project ID: P-1",
    });
    expect(row).not.toHaveProperty("email_address");
    expect(row).not.toHaveProperty("project_id");
  });

  it("auto-assigns a yearly Client ID when the form leaves it blank", () => {
    const row = buildCoreClientInsert(
      "uuid-1",
      makeForm({ clientId: "  " }),
      ["CL-2026-004"],
    );
    expect(row.client_id).toMatch(/^CL-\d{4}-\d{3}$/);
  });
});

describe("buildClientProfilePatch", () => {
  it("only includes filled expanded fields", () => {
    expect(buildClientProfilePatch(makeForm({ designation: "" }))).toEqual({
      project_id: "P-1",
      email_address: "ada@example.org",
    });
  });
});

describe("saveNewClient", () => {
  it("inserts core columns then patches profile fields", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const updates: Array<Record<string, unknown>> = [];

    const saved = await saveNewClient(makeForm(), [], {
      insert: async (row) => {
        inserts.push(row);
        expect(row).not.toHaveProperty("email_address");
        return { id: row.id as string, ...row };
      },
      update: async (id, patch) => {
        updates.push(patch);
        return { id, name: "Ada Lovelace", ...patch };
      },
    });

    expect(inserts).toHaveLength(1);
    expect(updates).toEqual([
      {
        project_id: "P-1",
        email_address: "ada@example.org",
        designation: "PI",
      },
    ]);
    expect(saved.email_address).toBe("ada@example.org");
  });

  it("still succeeds when the profile patch is rejected", async () => {
    const saved = await saveNewClient(makeForm(), [], {
      insert: async (row) => ({ id: row.id as string, ...row }),
      update: async () => {
        throw {
          code: "PGRST204",
          message:
            "Could not find the 'email_address' column of 'client' in the schema cache",
        };
      },
    });

    expect(saved.name).toBe("Ada Lovelace");
    expect(saved.contact_info).toBe("ada@example.org | PGCV");
  });

  it("retries the insert without unknown optional columns", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    await saveNewClient(makeForm(), [], {
      insert: async (row) => {
        inserts.push(row);
        if ("notes" in row) {
          throw {
            code: "PGRST204",
            message:
              "Could not find the 'notes' column of 'client' in the schema cache",
          };
        }
        return { id: row.id as string, ...row };
      },
      update: async () => null,
    });

    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toHaveProperty("notes");
    expect(inserts[1]).not.toHaveProperty("notes");
  });
});

describe("normalizeClientIdKey", () => {
  it("normalizes standard and prefixed IDs", () => {
    expect(normalizeClientIdKey("CL-2024-128")).toBe("CL-2024-128");
    expect(normalizeClientIdKey("  cl-2024-128  ")).toBe("CL-2024-128");
    expect(normalizeClientIdKey("PGCV-CL-2024-150")).toBe("CL-2024-150");
  });

  it("treats placeholders as empty", () => {
    expect(normalizeClientIdKey("")).toBeNull();
    expect(normalizeClientIdKey("N/A")).toBeNull();
    expect(normalizeClientIdKey("-")).toBeNull();
  });
});

describe("parseExternalClientIds", () => {
  it("splits multi-ID Excel cells", () => {
    expect(parseExternalClientIds("CL-2024-142, CL-2024-143")).toEqual([
      "CL-2024-142",
      "CL-2024-143",
    ]);
  });
});

describe("matchClientByExternalId", () => {
  const lookup = buildClientIdLookup([
    makeClient(),
    makeClient({
      id: "uuid-2",
      clientId: "CL-2024-143",
      clientName: "Second Client",
    }),
  ]);

  it("matches exact and PGCV-prefixed IDs", () => {
    expect(matchClientByExternalId("CL-2024-128", lookup).status).toBe(
      "matched",
    );
    expect(matchClientByExternalId("PGCV-CL-2024-128", lookup).client?.name).toBe(
      "Ada Lovelace",
    );
  });

  it("matches the first ID in a multi-ID cell", () => {
    const result = matchClientByExternalId(
      "CL-2024-999, CL-2024-143",
      lookup,
    );
    expect(result.status).toBe("matched");
    expect(result.client?.clientId).toBe("CL-2024-143");
  });

  it("returns unmatched / empty correctly", () => {
    expect(matchClientByExternalId("CL-2099-001", lookup).status).toBe(
      "unmatched",
    );
    expect(matchClientByExternalId("N/A", lookup).status).toBe("empty");
    expect(matchClientByExternalId("", lookup).status).toBe("empty");
  });
});
