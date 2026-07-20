"use client";

import React, { memo, useEffect, useRef } from "react";
import { X, Save } from "lucide-react";

/**
 * Renders a section label with an icon and text, used as section headers
 * inside SlideOver form bodies. Exact duplicate of the previously inlined helper.
 */
export function renderSectionLabel(icon: React.ReactNode, text: string) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold text-[#2a7797] uppercase tracking-[1.5px] mb-2 mt-0.5 font-quicksand">
      {icon} <span>{text}</span>
    </div>
  );
}

interface SlideOverModalProps {
  /** Whether the sidebar is visible */
  isOpen: boolean;
  /** Called when the backdrop or close button is clicked */
  onClose: () => void;
  /** Heading text displayed in the sidebar header */
  title: string;
  /** Optional subheading below the title */
  subtitle?: string;
  /** Form body content (sections of fields) */
  children: React.ReactNode;
  /** When provided, wraps children in a <form> with this submit handler */
  onSubmit?: (e: React.FormEvent) => void;
  /** Label for the submit button (default "Save") */
  submitLabel?: string;
  /** When true, shows "Saving…" on the submit button */
  isSaving?: boolean;
  /** When true, disables the submit button */
  submitDisabled?: boolean;
  /** Completely replace the default footer (Cancel + Save buttons) */
  footer?: React.ReactNode;
}

/**
 * Base slide-over sidebar modal component.
 *
 * Renders the backdrop, animated sidebar panel, decorative bar, header,
 * scrollable form body (`children`), and sticky action footer.
 *
 * All 5 entity modals (project, collaboration, task, analysis, sample)
 * use this component as their common skeleton to eliminate ~100 lines of
 * duplicated markup per modal.
 */
const SlideOverModal = memo(function SlideOverModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = "Save",
  isSaving = false,
  submitDisabled = false,
  footer,
}: SlideOverModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store current focus to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the panel
    const panel = panelRef.current;
    if (panel) {
      // Focus first focusable element or the panel itself
      const focusable = panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length > 0) {
        focusable[0]?.focus();
      } else {
        panel.focus();
      }
    }

    // Trap Tab key and handle Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusable = panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const renderDefaultFooter = () => (
    <div className="flex gap-2.5 justify-end pt-5 pb-1 border-t border-slate-100 bg-[#ffffff]">
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors font-aileron"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitDisabled}
        className="flex items-center gap-1.5 h-10 px-4 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md shadow-slate-400/20 transition-all font-aileron disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-3.5 h-3.5" />
        <span>{isSaving ? "Saving..." : submitLabel}</span>
      </button>
    </div>
  );

  const body = (
    <div className="bg-[#ffffff] flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar">
      {children}
      {footer !== undefined ? footer : renderDefaultFooter()}
    </div>
  );

  return (
    <>
      {/* Backdrop overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 w-screen h-screen z-[90] bg-transparent transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
        tabIndex={-1}
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-[0_0_40px_0_rgba(15,23,42,0.12)] z-[100] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Decorative accent bar */}
        <div className="h-1.5 w-full bg-[#4ec2bb]" />

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-slate-100 bg-[#ffffff]">
          <div>
            <h3 id="slideover-title" className="text-lg font-bold text-[#2a7797] tracking-tight font-aileron">
              {title}
            </h3>
            {subtitle && (
              <p className="text-slate-500 text-[11px] mt-0.5 font-semibold font-aileron">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body (wrapped in <form> when onSubmit is provided) */}
        {onSubmit ? <form onSubmit={onSubmit}>{body}</form> : body}
      </div>
    </>
  );
});

export default SlideOverModal;
