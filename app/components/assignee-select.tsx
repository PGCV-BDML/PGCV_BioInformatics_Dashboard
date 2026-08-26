"use client";

interface AssigneeMultiSelectProps {
  selected: string[];
  users: { id: string; name: string }[];
  onChange: (ids: string[]) => void;
  /** Analysis-linked tasks are limited to one person. */
  max?: number;
  error?: string;
  hint?: string;
  label?: string;
  disabled?: boolean;
}

export function AssigneeMultiSelect({
  selected,
  users,
  onChange,
  max,
  error,
  hint = "Select one or more people, or leave unassigned.",
  label,
  disabled = false,
}: AssigneeMultiSelectProps) {
  const heading = label ?? (max === 1 ? "Assignee" : "Assignees");
  const groupLabel = heading;

  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
      return;
    }
    if (max === 1) {
      onChange([id]);
      return;
    }
    if (max != null && selected.length >= max) return;
    onChange([...selected, id]);
  };

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-800 ml-1 font-aileron">
        {heading}
      </span>
      <p className="text-[10px] text-slate-400 ml-1 mb-1 font-aileron">{hint}</p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={groupLabel}
      >
        {sorted.map((user) => {
          const active = selected.includes(user.id);
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => toggle(user.id)}
              aria-pressed={active}
              disabled={disabled}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all font-aileron ${
                active
                  ? "bg-[#e6f4f8] text-[#2a7797] border-[rgba(42,119,151,0.4)] ring-2 ring-[#2a7797]/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white"
              } ${disabled ? "opacity-70 cursor-not-allowed hover:bg-slate-50 hover:border-slate-200" : ""}`}
            >
              {user.name}
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
