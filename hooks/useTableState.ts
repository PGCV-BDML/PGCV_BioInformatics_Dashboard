"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

interface SortConfig<T> {
  key: keyof T;
  direction: "asc" | "desc";
}

export function useTableState<T extends { id: string }>({
  items,
  itemsPerPage,
  resetKey,
  customSorters,
  initialSort = null,
  pinToBottom,
}: {
  items: T[];
  itemsPerPage: number;
  resetKey: string;
  customSorters?: Partial<Record<keyof T, (a: T, b: T) => number>>;
  initialSort?: SortConfig<T> | null;
  /** When true, item is sorted after all non-pinned items (e.g. completed tasks). */
  pinToBottom?: (item: T) => boolean;
}) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    initialSort,
  );
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = useCallback((key: keyof T) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key && prev.direction === "asc") {
        return { key, direction: "desc" as const };
      }
      return { key, direction: "asc" as const };
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sortConfig && !pinToBottom) return items;

    const customSorter = sortConfig
      ? customSorters?.[sortConfig.key]
      : undefined;

    return [...items].sort((a, b) => {
      if (pinToBottom) {
        const aPinned = pinToBottom(a) ? 1 : 0;
        const bPinned = pinToBottom(b) ? 1 : 0;
        if (aPinned !== bPinned) return aPinned - bPinned;
      }

      if (!sortConfig) return 0;

      const cmp = customSorter
        ? customSorter(a, b)
        : String(a[sortConfig.key] ?? "").toLowerCase().localeCompare(
            String(b[sortConfig.key] ?? "").toLowerCase(),
          );
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [items, sortConfig, customSorters, pinToBottom]);

  const displayed = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey, itemsPerPage]);

  return {
    sortConfig,
    handleSort,
    sorted,
    displayed,
    currentPage,
    setCurrentPage,
    totalItems: sorted.length,
  };
}
