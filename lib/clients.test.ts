import { describe, expect, it } from "vitest";
import {
  buildClientIdLookup,
  buildClientPayload,
  buildLegacyClientPayload,
  extractEmailAddress,
  mapClientRowToRecord,
  matchClientByExternalId,
  normalizeClientIdKey,
  parseExternalClientIds,
  saveClientWithSchemaFallback,
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

describe("saveClientWithSchemaFallback", () => {
  it("retries without the unknown column, then succeeds", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const save = async (payload: Record<string, unknown>) => {
      calls.push(payload);
      if ("email_address" in payload) {
        throw {
          code: "PGRST204",
          message:
            "Could not find the 'email_address' column of 'client' in the schema cache",
        };
      }
      return { id: "uuid-1", ...payload };
    };

    const saved = await saveClientWithSchemaFallback(save, makeForm());
    expect(calls).toHaveLength(2);
    expect(calls[0]).toHaveProperty("email_address");
    expect(calls[1]).not.toHaveProperty("email_address");
    expect(saved.name).toBe("Ada Lovelace");
  });

  it("falls back to the original schema when the error is not a missing column", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const save = async (payload: Record<string, unknown>) => {
      calls.push(payload);
      if ("email_address" in payload) {
        throw new Error("insert failed");
      }
      return { id: "uuid-1", ...payload };
    };

    const saved = await saveClientWithSchemaFallback(save, makeForm());
    expect(calls).toHaveLength(2);
    expect(calls[1]).not.toHaveProperty("email_address");
    expect(saved.notes).toBe("Project ID: P-1");
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
