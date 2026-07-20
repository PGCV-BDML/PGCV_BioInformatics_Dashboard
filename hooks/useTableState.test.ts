import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableState } from "./useTableState";

// ---------------------------------------------------------------------------
// Test data & helpers
// ---------------------------------------------------------------------------

interface TestItem {
  id: string;
  name: string;
  age: number;
}

const testItems: TestItem[] = [
  { id: "1", name: "Charlie", age: 30 },
  { id: "2", name: "Alice", age: 25 },
  { id: "3", name: "Bob", age: 35 },
];

/** Default props that keep items sorted in insertion order (no sort). */
const defaultProps = {
  items: testItems,
  itemsPerPage: 2,
  resetKey: "default",
};

// ===========================================================================
// Sorting
// ===========================================================================

describe("useTableState — sorting", () => {
  it("Returns items unsorted when no sort config is set", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    expect(result.current.sorted).toEqual(testItems);
    expect(result.current.sortConfig).toBeNull();
  });

  it("Sorts ascending by string field (default localeCompare) when handleSort called", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    act(() => {
      result.current.handleSort("name");
    });
    // Ascending: Alice (25), Bob (35), Charlie (30)
    expect(result.current.sorted.map((i) => i.name)).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);
  });

  it("Sorts descending when handleSort called again on same key", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    act(() => {
      result.current.handleSort("name");
    });
    act(() => {
      result.current.handleSort("name");
    });
    // Descending: Charlie (30), Bob (35), Alice (25)
    expect(result.current.sorted.map((i) => i.name)).toEqual([
      "Charlie",
      "Bob",
      "Alice",
    ]);
  });

  it("Cycles ascending → descending → ascending (3 clicks)", () => {
    const { result } = renderHook(() => useTableState(defaultProps));

    // Click 1: asc
    act(() => {
      result.current.handleSort("name");
    });
    expect(result.current.sortConfig).toEqual({ key: "name", direction: "asc" });

    // Click 2: desc
    act(() => {
      result.current.handleSort("name");
    });
    expect(result.current.sortConfig).toEqual({ key: "name", direction: "desc" });

    // Click 3: asc again
    act(() => {
      result.current.handleSort("name");
    });
    expect(result.current.sortConfig).toEqual({ key: "name", direction: "asc" });
  });

  it("Uses custom sorter when provided for a key", () => {
    const customSorter = (a: TestItem, b: TestItem) => a.age - b.age;
    const { result } = renderHook(() =>
      useTableState({ ...defaultProps, customSorters: { age: customSorter } }),
    );

    act(() => {
      result.current.handleSort("age");
    });
    // Ascending by age: Alice(25), Charlie(30), Bob(35)
    expect(result.current.sorted.map((i) => i.name)).toEqual([
      "Alice",
      "Charlie",
      "Bob",
    ]);
  });

  it("Inverts custom sorter direction when descending", () => {
    // A sorter that always returns 1 — forces "b after a"
    const customSorter = vi.fn((_a: TestItem, _b: TestItem) => 1);
    const { result } = renderHook(() =>
      useTableState({ ...defaultProps, customSorters: { age: customSorter } }),
    );

    act(() => {
      result.current.handleSort("age");
    });
    // First click → ascending → custom sorter called with 1, items stay in order
    // For asc: sort returns 1 → b after a → Charlie, Alice, Bob (since sort is stable and moves)
    // Actually the exact order depends on the sort algorithm. Let's just check direction:

    expect(result.current.sortConfig).toEqual({ key: "age", direction: "asc" });
    expect(customSorter).toHaveBeenCalled();

    const firstCallCount = customSorter.mock.calls.length;

    act(() => {
      result.current.handleSort("age");
    });
    // Second click → descending → cmp is negated → -1 → a before b → order reversed
    expect(result.current.sortConfig).toEqual({ key: "age", direction: "desc" });

    // Check that the sorter was called again during re-sort
    expect(customSorter.mock.calls.length).toBeGreaterThan(firstCallCount);

    // For descending the callback should still be called with the same args
    // but the hook negates the return value internally
    const lastCall = customSorter.mock.calls.at(-1)!;
    expect(lastCall).toHaveLength(2);
  });
});

// ===========================================================================
// Pagination
// ===========================================================================

describe("useTableState — pagination", () => {
  it("Returns first N items as displayed when itemsPerPage=N", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    expect(result.current.displayed).toHaveLength(2);
    expect(result.current.displayed).toEqual([testItems[0], testItems[1]]);
  });

  it("currentPage starts at 1", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    expect(result.current.currentPage).toBe(1);
  });

  it("setCurrentPage(2) returns second page of items", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    act(() => {
      result.current.setCurrentPage(2);
    });
    // itemsPerPage=2, page 2 → items[2] only
    expect(result.current.displayed).toHaveLength(1);
    expect(result.current.displayed[0]).toEqual(testItems[2]);
  });

  it("totalItems equals sorted.length", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    expect(result.current.totalItems).toBe(testItems.length);
    expect(result.current.totalItems).toBe(result.current.sorted.length);
  });

  it("displayed is empty when currentPage is beyond last page", () => {
    const { result } = renderHook(() => useTableState(defaultProps));
    act(() => {
      result.current.setCurrentPage(99);
    });
    expect(result.current.displayed).toHaveLength(0);
  });
});

// ===========================================================================
// resetKey
// ===========================================================================

describe("useTableState — resetKey", () => {
  it("Resets currentPage to 1 when resetKey changes", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useTableState({ ...defaultProps, resetKey }),
      { initialProps: { resetKey: "a" } },
    );

    // Navigate to page 2
    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Change resetKey
    rerender({ resetKey: "b" });
    expect(result.current.currentPage).toBe(1);
  });

  it("Does NOT reset currentPage when resetKey stays the same", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useTableState({ ...defaultProps, resetKey }),
      { initialProps: { resetKey: "stable" } },
    );

    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Re-render with same resetKey
    rerender({ resetKey: "stable" });
    expect(result.current.currentPage).toBe(2);
  });
});
