"use client";
import { useCallback, useRef } from "react";
import { deleteDataFromDB } from "@/lib/supabase";
import type { TableNames } from "@/lib/supabase";
import { describeDeleteError } from "@/lib/db-errors";

export function useDeleteRecord<T extends { id: string }>(
  table: TableNames,
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  /**
   * `message` is a user-facing explanation — for a foreign-key
   * failure it names the records that are blocking the delete.
   */
  onError?: (error: unknown, message: string) => void,
) {
  // Use a ref so the useCallback below does not need onError in its dependency
  // array — avoids re-creating the delete function when the caller passes a new
  // inline arrow function on every render.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  return useCallback(
    async (item: T, onSuccess?: () => void) => {
      try {
        await deleteDataFromDB(table, item.id);
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        onSuccess?.();
      } catch (error) {
        console.error(`Failed to delete from ${table}:`, error);
        onErrorRef.current?.(error, describeDeleteError(error, table));
      }
    },
    [table, setItems],
  );
}
