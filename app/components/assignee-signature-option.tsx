"use client";

import { useId } from "react";
import { PenLine } from "lucide-react";

interface AssigneeSignatureOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Hide when the current user is not allowed to stamp Prepared by. */
  visible?: boolean;
}

/** Optional checkbox shown next to a PDF upload for the assignee's e-sig. */
export function AssigneeSignatureOption({
  checked,
  onChange,
  disabled = false,
  visible = true,
}: AssigneeSignatureOptionProps) {
  const inputId = useId();
  if (!visible) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
      <input
        type="checkbox"
        id={inputId}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-[#2a7797] focus:ring-[#2a7797]"
      />
      <label
        htmlFor={inputId}
        className="cursor-pointer select-none text-xs text-slate-600"
      >
        <span className="block font-semibold text-slate-700">
          Attach my e-signature
        </span>
        After this PDF is saved, place your signature under{" "}
        <em>Prepared by</em> on the last page. Upload it first under the
        profile menu → My signature.
      </label>
    </div>
  );
}

interface AttachAssigneeSignatureButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/** Action on an already-stored PDF. */
export function AttachAssigneeSignatureButton({
  onClick,
  disabled = false,
}: AttachAssigneeSignatureButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 self-start text-[10px] font-bold text-[#2a7797] underline decoration-dotted hover:text-[#1f5c76] disabled:opacity-50"
    >
      <PenLine className="h-3 w-3" aria-hidden="true" />
      Attach e-signature
    </button>
  );
}
