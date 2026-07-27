"use client";

import type { TaskCategory } from "@/types/database";
import {
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_STYLES,
} from "@/lib/task-categories";

interface CategoryChipsProps {
  categories: TaskCategory[];
  maxVisible?: number;
  size?: "sm" | "xs";
  className?: string;
}

export function CategoryChips({
  categories,
  maxVisible = 3,
  size = "xs",
  className = "",
}: CategoryChipsProps) {
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
          className={`inline-flex items-center rounded-lg border font-extrabold uppercase tracking-wider font-quicksand ${sizeClass} ${TASK_CATEGORY_STYLES[cat]}`}
          title={TASK_CATEGORY_LABELS[cat]}
        >
          {TASK_CATEGORY_LABELS[cat]}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[9px] font-bold text-slate-400 font-quicksand">
          +{overflow}
        </span>
      )}
    </div>
  );
}

interface CategoryMultiSelectProps {
  selected: TaskCategory[];
  options: { value: TaskCategory; label: string }[];
  onChange: (next: TaskCategory[]) => void;
  error?: string;
}

export function CategoryMultiSelect({
  selected,
  options,
  onChange,
  error,
}: CategoryMultiSelectProps) {
  const toggle = (value: TaskCategory) => {
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
        Select one or more tags for this task.
      </p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Task categories"
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
                  ? `${TASK_CATEGORY_STYLES[opt.value]} ring-2 ring-[#2a7797]/25`
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
