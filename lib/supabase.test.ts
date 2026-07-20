import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabase,
  getCurrentUser,
  getUsersFromDB,
  getNameIdFromDB,
  getRowsFromDB,
  saveDataToDB,
  deleteDataFromDB,
} from "./supabase";

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js
// We return a singleton mock client so that the `supabase` variable exported
// by ./supabase is the same object we can spy on / configure in every test.
// ---------------------------------------------------------------------------
vi.mock("@supabase/supabase-js", () => {
  const mockClient = {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  };
  return {
    createClient: vi.fn(() => mockClient),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a chainable mock that mimics the fluent Supabase query builder.
 *
 * Methods that return the chain (select, in, eq, update, upsert, delete)
 * let `await chain` destructure `.data` / `.error`.
 *
 * Terminal methods (maybeSingle, single) return `{ data, error }` directly.
 */
function createChain(data: unknown = null, error: unknown = null) {
  const terminalResult = { data, error };

  const chain: Record<string, unknown> = {
    data,
    error,
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    update: vi.fn(() => chain as any),
    upsert: vi.fn(() => chain as any),
    delete: vi.fn(() => chain as any),
    maybeSingle: vi.fn(() => terminalResult),
    single: vi.fn(() => terminalResult),
  };

  return chain;
}

// ---------------------------------------------------------------------------
// Set up shared mock references
// ---------------------------------------------------------------------------
const mockFrom = vi.mocked(supabase.from);
const mockGetSession = vi.mocked(supabase.auth.getSession);

beforeEach(() => {
  vi.clearAllMocks();
  // Default mock chain — no data, no error
  mockFrom.mockReturnValue(createChain() as any);
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
});

// ===========================================================================
// getRowsFromDB
// ===========================================================================
describe("getRowsFromDB", () => {
  it("Returns data array on success", async () => {
    const testData = [{ id: "1", name: "Alpha" }];
    mockFrom.mockReturnValue(createChain(testData) as any);

    const result = await getRowsFromDB("project");
    expect(result).toEqual(testData);
    expect(mockFrom).toHaveBeenCalledWith("project");
  });

  it("Throws error when fetchError is not null", async () => {
    const testError = new Error("DB error");
    mockFrom.mockReturnValue(createChain(null, testError) as any);

    await expect(getRowsFromDB("project")).rejects.toThrow("DB error");
  });

  it("Returns empty array when data is null", async () => {
    mockFrom.mockReturnValue(createChain(null) as any);

    const result = await getRowsFromDB("project");
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// getNameIdFromDB
// ===========================================================================
describe("getNameIdFromDB", () => {
  it("Returns data array on success", async () => {
    const testData = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ];
    mockFrom.mockReturnValue(createChain(testData) as any);

    const result = await getNameIdFromDB("users");
    expect(result).toEqual(testData);
    expect(mockFrom).toHaveBeenCalledWith("users");
  });

  it("Throws error on fetch error", async () => {
    const testError = new Error("Fetch failed");
    mockFrom.mockReturnValue(createChain(null, testError) as any);

    await expect(getNameIdFromDB("users")).rejects.toThrow("Fetch failed");
  });
});

// ===========================================================================
// getUsersFromDB
// ===========================================================================
describe("getUsersFromDB", () => {
  it("Returns empty array when invalid roles are passed", async () => {
    const result = await getUsersFromDB(["invalid_role", "also_bad"]);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("Returns empty array when empty roles array is passed", async () => {
    const result = await getUsersFromDB([]);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("Returns users on success with valid roles", async () => {
    const testData = [
      { id: "1", name: "Charlie", role: "team_member" },
    ];
    mockFrom.mockReturnValue(createChain(testData) as any);

    const result = await getUsersFromDB(["team_member", "intern"]);
    expect(result).toEqual(testData);
    expect(mockFrom).toHaveBeenCalledWith("users");
  });

  it("Throws error on fetch error", async () => {
    const testError = new Error("Users fetch error");
    mockFrom.mockReturnValue(createChain(null, testError) as any);

    await expect(getUsersFromDB(["team_lead"])).rejects.toThrow("Users fetch error");
  });
});

// ===========================================================================
// getCurrentUser
// ===========================================================================
describe("getCurrentUser", () => {
  it("Returns user when session exists", async () => {
    const testUser = {
      id: "u1",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
    };
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: testUser,
        },
      },
      error: null,
    });

    const result = await getCurrentUser();
    expect(result).toEqual(testUser);
  });

  it("Returns null when no session", async () => {
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});

// ===========================================================================
// saveDataToDB
// ===========================================================================
describe("saveDataToDB", () => {
  it("Throws when data is not a plain object (array)", async () => {
    // The function always makes the first from() call to check if row exists
    // even though the data will be rejected afterwards
    mockFrom.mockReturnValue(createChain(null) as any);

    await expect(
      saveDataToDB("project", "123", [] as any),
    ).rejects.toThrow("must be a plain object");
  });

  it("Throws when data is null", async () => {
    mockFrom.mockReturnValue(createChain(null) as any);

    await expect(
      saveDataToDB("project", "123", null as any),
    ).rejects.toThrow("must be a plain object");
  });

  it("Calls update when row exists", async () => {
    const existingRow = { id: "123", name: "old" };
    const updatedRow = { id: "123", name: "new" };

    // First chain: check existing row
    const chain1 = createChain(null);
    chain1.maybeSingle = vi.fn(() => ({ data: existingRow, error: null }));

    // Second chain: perform update
    const chain2 = createChain(null);
    chain2.single = vi.fn(() => ({ data: updatedRow, error: null }));

    mockFrom.mockReturnValueOnce(chain1 as any).mockReturnValueOnce(chain2 as any);

    const result = await saveDataToDB("project", "123", { name: "new" });
    expect(result).toEqual(updatedRow);
    expect(chain1.eq).toHaveBeenCalledWith("id", "123");
    expect(chain2.update).toHaveBeenCalledWith({ name: "new" });
  });

  it("Calls upsert when row doesn't exist", async () => {
    const insertedRow = { id: "123", name: "new" };

    // First chain: check existing row — no row found
    const chain1 = createChain(null);
    chain1.maybeSingle = vi.fn(() => ({ data: null, error: null }));

    // Second chain: perform upsert
    const chain2 = createChain(null);
    chain2.single = vi.fn(() => ({ data: insertedRow, error: null }));

    mockFrom.mockReturnValueOnce(chain1 as any).mockReturnValueOnce(chain2 as any);

    const result = await saveDataToDB("project", "123", { name: "new" });
    expect(result).toEqual(insertedRow);
    expect(chain2.upsert).toHaveBeenCalledWith({ id: "123", name: "new" });
  });

  it("Throws on fetch error when checking existing row", async () => {
    const fetchError = new Error("Fetch check failed");
    mockFrom.mockReturnValue(createChain(null, fetchError) as any);

    await expect(
      saveDataToDB("project", "123", { name: "x" }),
    ).rejects.toThrow("Fetch check failed");
  });
  // ponytail: saveDataToDB test coverage limited by mock complexity
  // Coverage: data validation, update path, upsert path, fetch error path.
});

// ===========================================================================
// deleteDataFromDB
// ===========================================================================
describe("deleteDataFromDB", () => {
  it("Calls delete with correct table and id", async () => {
    mockFrom.mockReturnValue(createChain(null) as any);

    await deleteDataFromDB("task", "t-42");
    expect(mockFrom).toHaveBeenCalledWith("task");
    // The chain's eq method should have been called with "id" and "t-42"
    // We verify via the mock chain returned by mockFrom
    const chain = mockFrom.mock.results[0]?.value as any;
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "t-42");
  });

  it("Throws on error", async () => {
    const deleteError = new Error("Delete failed");
    mockFrom.mockReturnValue(createChain(null, deleteError) as any);

    await expect(deleteDataFromDB("task", "t-42")).rejects.toThrow("Delete failed");
  });
});
