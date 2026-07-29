import { describe, expect, it } from "vitest";
import {
  buildClientIdLookup,
  matchClientByExternalId,
  normalizeClientIdKey,
  parseExternalClientIds,
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
