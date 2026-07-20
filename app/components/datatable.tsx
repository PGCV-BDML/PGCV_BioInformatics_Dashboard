"use client";

import React, { memo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: keyof T | "actions";
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortConfig: { key: keyof T; direction: "asc" | "desc" } | null;
  onSort?: (key: keyof T) => void;
  emptyMessage?: string;
}

function DataTableInner<T extends { id: string | number }>({
  columns,
  data,
  sortConfig,
  onSort,
  emptyMessage = "No active records found matching your criteria.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-surface shadow-sm">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-200 text-[13px] font-semibold text-[#55656e] select-none">
            {columns.map((col, index) => {
              const isSortable =
                col.sortable && onSort && col.key !== "actions";

              return (
                <th
                  key={index}
                  style={{ width: col.width }}
                  onClick={() => isSortable && onSort(col.key as keyof T)}
                  className={`px-4 py-3.5 bg-[#2A7797]/10 transition-colors ${
                    isSortable
                      ? "group cursor-pointer hover:bg-[#2A7797]/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{col.label}</span>

                    {isSortable &&
                      (sortConfig?.key === col.key ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-[#2A7797] flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[#2A7797] flex-shrink-0" />
                        )
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 opacity-30 transition-opacity group-hover:opacity-100 flex-shrink-0" />
                      ))}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="text-[12px] text-[#2c3a42]">
          {data.map((item) => (
            <tr
              key={item.id}
              className="odd:bg-surface even:bg-[#F6F4EE]/40 border-b border-gray-200/40 transition-colors hover:bg-[#F1EFE8]/70"
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-2.5 align-middle overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {col.render ? (
                    <div className="w-full h-full overflow-hidden text-ellipsis">
                      {col.render(item)}
                    </div>
                  ) : (
                    <span
                      className="block truncate"
                      title={String(item[col.key as keyof T] ?? "")}
                    >
                      {String(item[col.key as keyof T] ?? "—")}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}

          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center font-medium text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const DataTable = memo(DataTableInner) as unknown as <T extends { id: string | number }>(
  props: DataTableProps<T>
) => React.JSX.Element;

export default DataTable;
