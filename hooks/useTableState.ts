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
}: {
  items: T[];
  itemsPerPage: number;
  resetKey: string;
  customSorters?: Partial<Record<keyof T, (a: T, b: T) => number>>;
}) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);
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
    if (!sortConfig) return items;
    const customSorter = customSorters?.[sortConfig.key];
    return [...items].sort((a, b) => {
      const cmp = customSorter
        ? customSorter(a, b)
        : String(a[sortConfig.key] ?? "").toLowerCase().localeCompare(
            String(b[sortConfig.key] ?? "").toLowerCase(),
          );
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [items, sortConfig, customSorters]);

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
