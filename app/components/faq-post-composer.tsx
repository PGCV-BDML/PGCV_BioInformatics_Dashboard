"use client";

import { useRef, useState } from "react";
import { Code2, Eye, Link2, PencilLine } from "lucide-react";
import { insertWrap } from "@/lib/markdown";
import { MarkdownBody } from "./markdown-body";

const textareaClass =
  "w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#4ec2bb]/10 focus:border-[#4ec2bb] outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400/80 transition-all shadow-sm resize-y disabled:opacity-70 disabled:cursor-not-allowed disabled:focus:ring-0 disabled:focus:border-slate-300/80 font-aileron";

interface FaqPostComposerProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export function FaqPostComposer({
  value,
  onChange,
  placeholder = "Write in markdown. Use ``` for code and [text](url) for links.",
  rows = 8,
  maxLength,
  disabled = false,
  error,
  id,
}: FaqPostComposerProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyWrap = (before: string, after?: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = insertWrap(value, start, end, before, after);
    onChange(next.next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => applyWrap("```\n", "\n```")}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-quicksand"
        >
          <Code2 className="w-3 h-3" /> Code
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => applyWrap("[", "](https://)")}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-quicksand"
        >
          <Link2 className="w-3 h-3" /> Link
        </button>
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={() => setPreview((open) => !open)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-quicksand ml-auto"
        >
          {preview ? (
            <>
              <PencilLine className="w-3 h-3" /> Edit
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" /> Preview
            </>
          )}
        </button>
      </div>
      {preview ? (
        <div className="min-h-[8rem] rounded-xl border border-slate-200 bg-white p-3.5">
          <MarkdownBody source={value} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          className={textareaClass}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? (
        <p className="text-red-500 text-xs ml-1 font-aileron" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
