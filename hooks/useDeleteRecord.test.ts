import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useDeleteRecord } from "./useDeleteRecord";
import { deleteDataFromDB } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Mock @/lib/supabase
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase", () => ({
  deleteDataFromDB: vi.fn(),
}));

const mockDeleteDataFromDB = vi.mocked(deleteDataFromDB);

// ---------------------------------------------------------------------------
// Test data & helpers
// ---------------------------------------------------------------------------

interface TestItem {
  id: string;
  name: string;
  age: number;
}

const testItems: TestItem[] = [
  { id: "1", name: "Alice", age: 25 },
  { id: "2", name: "Bob", age: 35 },
  { id: "3", name: "Charlie", age: 30 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// useDeleteRecord
// ===========================================================================

describe("useDeleteRecord", () => {
  it("Calls deleteDataFromDB with correct table and item id", async () => {
    mockDeleteDataFromDB.mockResolvedValue(undefined);

    const { result } = renderHook(() => {
      const [items, setItems] = useState<TestItem[]>(testItems);
      const deleteRecord = useDeleteRecord<TestItem>("task", setItems);
      return { items, deleteRecord };
    });

    await act(async () => {
      await result.current.deleteRecord({ id: "1", name: "Alice", age: 25 });
    });

    expect(mockDeleteDataFromDB).toHaveBeenCalledTimes(1);
    expect(mockDeleteDataFromDB).toHaveBeenCalledWith("task", "1");
  });

  it("Removes item from list via setItems on success", async () => {
    mockDeleteDataFromDB.mockResolvedValue(undefined);

    const { result } = renderHook(() => {
      const [items, setItems] = useState<TestItem[]>(testItems);
      const deleteRecord = useDeleteRecord<TestItem>("task", setItems);
      return { items, deleteRecord };
    });

    expect(result.current.items).toHaveLength(3);

    await act(async () => {
      await result.current.deleteRecord({ id: "1", name: "Alice", age: 25 });
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.find((i) => i.id === "1")).toBeUndefined();
  });

  it("Calls onSuccess callback on success", async () => {
    mockDeleteDataFromDB.mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => {
      const [items, setItems] = useState<TestItem[]>(testItems);
      const deleteRecord = useDeleteRecord<TestItem>("task", setItems);
      return { items, deleteRecord };
    });

    await act(async () => {
      await result.current.deleteRecord(
        { id: "2", name: "Bob", age: 35 },
        onSuccess,
      );
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("Calls onError callback when deleteDataFromDB throws", async () => {
    const testError = new Error("DB fail");
    mockDeleteDataFromDB.mockRejectedValue(testError);
    const onError = vi.fn();

    const { result } = renderHook(() => {
      const [items, setItems] = useState<TestItem[]>(testItems);
      const deleteRecord = useDeleteRecord<TestItem>("task", setItems, onError);
      return { items, deleteRecord };
    });

    await act(async () => {
      await result.current.deleteRecord({ id: "1", name: "Alice", age: 25 });
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(testError);
  });

  it("Does NOT call onSuccess when deleteDataFromDB throws", async () => {
    mockDeleteDataFromDB.mockRejectedValue(new Error("fail"));
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => {
      const [items, setItems] = useState<TestItem[]>(testItems);
      const deleteRecord = useDeleteRecord<TestItem>("task", setItems, onError);
      return { items, deleteRecord };
    });

    await act(async () => {
      await result.current.deleteRecord(
        { id: "1", name: "Alice", age: 25 },
        onSuccess,
      );
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("Does NOT remove item from list when deleteDataFromDB throws", async () => {
    mockDeleteDataFromDB.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => {
      const [items, setItems] = useState<TestItem[]>(testItems);
      const deleteRecord = useDeleteRecord<TestItem>("task", setItems);
      return { items, deleteRecord };
    });

    expect(result.current.items).toHaveLength(3);

    await act(async () => {
      await result.current.deleteRecord({ id: "1", name: "Alice", age: 25 });
    });

    // List unchanged
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items.find((i) => i.id === "1")).toBeDefined();
  });
});
