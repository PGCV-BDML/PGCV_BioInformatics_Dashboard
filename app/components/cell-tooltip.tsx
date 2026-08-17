"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TruncatedTextProps = {
  /** Full value shown in the tooltip (and in the cell unless `display` is set). */
  text: string | null | undefined;
  /** Optional shorter/visible cell label (e.g. "Report" while tooltip shows the URL). */
  display?: string | null;
  className?: string;
  /** Use for long notes so the tooltip wraps cleanly. */
  multiline?: boolean;
  /** Visible lines in the cell before ellipsis. Tooltip still shows the full value. */
  lines?: 1 | 2;
  /** Show tooltip even when visible text is not truncated. */
  force?: boolean;
};

/**
 * Truncates cell text and shows a floating tooltip with the full value on hover/focus
 * when the visible text is clipped. Portaled so table overflow does not clip it.
 */
export function TruncatedText({
  text,
  display: displayProp,
  className = "",
  multiline = false,
  lines = 1,
  force = false,
}: TruncatedTextProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  const full = (text ?? "").trim();
  const visible = (displayProp ?? text ?? "").trim() || "—";
  const hasContent = full.length > 0;

  const isTruncated = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return false;
    return (
      el.scrollWidth > el.clientWidth + 1 ||
      el.scrollHeight > el.clientHeight + 1
    );
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = Math.min(360, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - tooltipWidth - 8,
    );
    setCoords({ top: rect.bottom + 6, left });
  }, []);

  const showIfNeeded = useCallback(() => {
    if (!hasContent) return;
    if (!force && !isTruncated()) return;
    updatePosition();
    setOpen(true);
  }, [force, hasContent, isTruncated, updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={hasContent ? 0 : undefined}
        aria-describedby={open ? tooltipId : undefined}
        className={`block min-w-0 outline-none ${
          lines === 2 ? "line-clamp-2 whitespace-normal" : "truncate"
        } ${className}`}
        onMouseEnter={showIfNeeded}
        onMouseLeave={hide}
        onFocus={showIfNeeded}
        onBlur={hide}
      >
        {visible}
      </span>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={`pointer-events-none fixed z-[200] max-w-[min(360px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] font-medium leading-snug text-white shadow-[0_12px_28px_rgba(15,23,42,0.28)] ${
              multiline ? "whitespace-pre-wrap break-words" : "break-words"
            }`}
            style={{ top: coords.top, left: coords.left }}
          >
            {full || visible}
          </div>,
          document.body,
        )}
    </>
  );
}
