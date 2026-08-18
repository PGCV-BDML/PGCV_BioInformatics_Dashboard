"use client";

import type { TaskCategory } from "@/types/database";
import {
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_STYLES,
} from "@/lib/task-categories";
import { TruncatedText } from "./cell-tooltip";

interface CategoryChipsProps<T extends string> {
  categories: T[];
  labels: Record<T, string>;
  styles: Record<T, string>;
  maxVisible?: number;
  size?: "sm" | "xs";
  className?: string;
}

export function CategoryChips<T extends string>({
  categories,
  labels,
  styles,
  maxVisible = 3,
  size = "xs",
  className = "",
}: CategoryChipsProps<T>) {
  if (!categories.length) {
    return (
      <span className="text-[10px] text-slate-400 font-medium font-aileron">—</span>
    );
  }

  const visible = categories.slice(0, maxVisible);
  const overflow = categories.length - visible.length;
  const sizeClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5"
      : "text-[9px] px-1.5 py-0.5";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visible.map((cat) => (
        <span
          key={cat}
          className={`inline-flex items-center rounded-lg border font-extrabold uppercase tracking-wider font-quicksand ${sizeClass} ${styles[cat]}`}
          title={labels[cat]}
        >
          {labels[cat]}
        </span>
      ))}
      {overflow > 0 && (
        <TruncatedText
          text={categories
            .slice(maxVisible)
            .map((cat) => labels[cat])
            .join(" · ")}
          display={`+${overflow}`}
          force
          className="!inline-block w-auto text-[9px] font-bold text-slate-400 font-quicksand"
        />
      )}
    </div>
  );
}

export function TaskCategoryChips({
  categories,
  maxVisible,
  size,
  className,
}: Omit<CategoryChipsProps<TaskCategory>, "labels" | "styles">) {
  return (
    <CategoryChips
      categories={categories}
      labels={TASK_CATEGORY_LABELS}
      styles={TASK_CATEGORY_STYLES}
      maxVisible={maxVisible}
      size={size}
      className={className}
    />
  );
}

interface CategoryMultiSelectProps<T extends string> {
  selected: T[];
  options: { value: T; label: string }[];
  styles: Record<T, string>;
  onChange: (next: T[]) => void;
  error?: string;
  hint?: string;
  groupLabel?: string;
}

export function CategoryMultiSelect<T extends string>({
  selected,
  options,
  styles,
  onChange,
  error,
  hint = "Select one or more tags for this task.",
  groupLabel = "Task categories",
}: CategoryMultiSelectProps<T>) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((c) => c !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-800 ml-1 font-aileron">
        Categories
      </span>
      <p className="text-[10px] text-slate-400 ml-1 mb-1 font-aileron">
        {hint}
      </p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={groupLabel}
      >
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border transition-all font-quicksand ${
                active
                  ? `${styles[opt.value]} ring-2 ring-[#2a7797]/25`
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-white"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-red-500 text-xs ml-1 mt-0.5 font-aileron" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
