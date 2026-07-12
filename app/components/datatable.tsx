"use client";

import React from "react";
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

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  sortConfig,
  onSort,
  emptyMessage = "No active records found matching your criteria.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
        <thead>
          <tr className="bg-[#f4f6f7] text-[#55656e] text-[13px] font-bold border-b border-gray-200 select-none">
            {columns.map((col, index) => {
              const isSortable =
                col.sortable && onSort && col.key !== "actions";
              return (
                <th
                  key={index}
                  style={{ width: col.width }}
                  onClick={() => isSortable && onSort(col.key as keyof T)}
                  className={`py-3 px-4 font-bold tracking-tight ${
                    isSortable
                      ? "cursor-pointer hover:bg-gray-200/60 transition-colors group"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {isSortable &&
                      (sortConfig?.key === col.key ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[#2a7797]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[#2a7797]" />
                        )
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                      ))}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="text-[13px] text-[#2c3a42]">
          {data.map((item) => (
            <tr
              key={item.id}
              className="odd:bg-[#ffffff] even:bg-white border-b border-gray-200/40 hover:bg-gray-100/40 transition-colors"
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className="py-3 px-4 break-words align-middle"
                >
                  {col.render
                    ? col.render(item)
                    : String(item[col.key as keyof T] || "—")}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-gray-400 font-medium"
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
