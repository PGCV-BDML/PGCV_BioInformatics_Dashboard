"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquareWarning, X } from "lucide-react";

interface RequestChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Shown in the subheading so the officer can see what they're sending back. */
  reportLabel: string;
  /** Rejects to surface an error without closing the modal. */
  onSubmit: (body: string) => Promise<void>;
  /** Defaults to approving-officer "Request changes" copy. */
  mode?: "changes" | "revision";
}

const MAX_LENGTH = 2000;

export default function RequestChangesModal({
  isOpen,
  onClose,
  reportLabel,
  onSubmit,
  mode = "changes",
}: RequestChangesModalProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRevision = mode === "revision";
  const title = isRevision ? "Request revision" : "Request changes";
  const submitLabel = isRevision
    ? "Send back for revision"
    : "Send back for changes";
  const helpText = isRevision
    ? "The assignee is notified and the report moves to Revision requested."
    : "The assignee is notified and the report moves to Changes requested.";
  const emptyError = isRevision
    ? "Write what needs revising before sending this back."
    : "Write what needs to change before sending this back.";

  useEffect(() => {
    if (!isOpen) return;
    setBody("");
    setError(null);
    textareaRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const trimmed = body.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!trimmed) {
      setError(emptyError);
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't send this back. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-changes-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-[24px] max-w-[520px] w-full flex flex-col overflow-hidden shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-1.5 w-full bg-amber-400 shrink-0" />

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <MessageSquareWarning className="w-4 h-4 text-amber-700" />
            </span>
            <div className="min-w-0">
              <h3
                id="request-changes-title"
                className="text-lg font-bold text-[#2a7797] tracking-tight"
              >
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                {reportLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label
              htmlFor="request-changes-body"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5"
            >
              What needs to be addressed
            </label>
            <textarea
              id="request-changes-body"
              ref={textareaRef}
              required
              rows={5}
              maxLength={MAX_LENGTH}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "request-changes-error" : undefined}
              placeholder="e.g. The methods section is missing the reference database version, and Table 2 has the wrong run ID."
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-amber-400/50 resize-y"
            />
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <p className="text-[11px] text-slate-400">
                {helpText}
              </p>
              <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                {body.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          {error && (
            <p
              id="request-changes-error"
              role="alert"
              className="text-xs text-red-600 font-semibold"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !trimmed}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
