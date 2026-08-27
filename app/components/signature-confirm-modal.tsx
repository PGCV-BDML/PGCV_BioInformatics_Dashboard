"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  PenLine,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  isMissingReportPdfError,
  prepareSignaturePreview,
  type SignaturePreview,
  type SignatureSlot,
} from "@/lib/service-report-signature";
import {
  nudgeSignatureRect,
  resizeSignatureRect,
  SIGNATURE_FINE_NUDGE_PT,
  SIGNATURE_NUDGE_PT,
  type SignatureRect,
} from "@/lib/signature-placement";
import { isMissingSignatureError } from "@/lib/user-signature";
import { SignaturePagePreview } from "./signature-page-preview";

export type SignOffAction = "review" | "approve";

const SLOT_BY_ACTION: Record<SignOffAction, SignatureSlot> = {
  review: "reviewed_by",
  approve: "approved_by",
};

const SLOT_LABEL: Record<SignatureSlot, string> = {
  reviewed_by: "Reviewed by",
  approved_by: "Approved for Release",
};

interface SignatureConfirmModalProps {
  isOpen: boolean;
  analysisId: string | null;
  action: SignOffAction | null;
  reportLabel?: string;
  onClose: () => void;
  onMissingSignature: () => void;
  onConfirm: (rect: SignatureRect) => Promise<void>;
}

export default function SignatureConfirmModal({
  isOpen,
  analysisId,
  action,
  reportLabel,
  onClose,
  onMissingSignature,
  onConfirm,
}: SignatureConfirmModalProps) {
  const checkboxId = useId();
  const onMissingSignatureRef = useRef(onMissingSignature);
  const [preview, setPreview] = useState<SignaturePreview | null>(null);
  const [rect, setRect] = useState<SignatureRect | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const slot = action ? SLOT_BY_ACTION[action] : null;
  const page = preview
    ? { width: preview.pageWidth, height: preview.pageHeight }
    : null;
  const aspectRatio = preview
    ? preview.imageWidth / Math.max(preview.imageHeight, 1)
    : 4;

  useEffect(() => {
    onMissingSignatureRef.current = onMissingSignature;
  }, [onMissingSignature]);

  useEffect(() => {
    if (!isOpen || !analysisId || !action) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const next = await prepareSignaturePreview(
          analysisId,
          SLOT_BY_ACTION[action],
        );
        if (cancelled) return;
        objectUrl = URL.createObjectURL(
          new Blob([next.signatureBytes.slice()], { type: "image/png" }),
        );
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreview(next);
        setRect(next.defaultRect);
        setSignatureUrl(objectUrl);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        if (isMissingSignatureError(err)) {
          onMissingSignatureRef.current();
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load this report for signing.",
        );
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [action, analysisId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  const confirmLabel = action === "approve" ? "Approve report" : "Complete review";
  const title =
    action === "approve" ? "Confirm approval signature" : "Confirm your signature";

  const canSubmit = Boolean(preview && rect && confirmed && !isSaving && !isLoading);

  const nudge = (dx: number, dy: number) => {
    if (!rect || !page) return;
    setRect(nudgeSignatureRect(rect, dx, dy, page, aspectRatio));
  };

  const bumpSize = (delta: number) => {
    if (!rect || !page) return;
    setRect(resizeSignatureRect(rect, rect.width + delta, page, aspectRatio));
  };

  async function handleConfirm() {
    if (!canSubmit || !rect) return;
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(rect);
    } catch (err) {
      console.error(err);
      if (isMissingSignatureError(err)) {
        onMissingSignatureRef.current();
        return;
      }
      if (isMissingReportPdfError(err)) {
        setError(err.message);
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't apply your signature. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hint = useMemo(() => {
    if (action === "approve") {
      return (
        <>
          This stamp goes under <em>Approved for Release</em>. The reviewing
          officer&apos;s signature should already be on this last page. Drag to
          move, use the corner or +/− to resize.
        </>
      );
    }
    return (
      <>
        This stamp goes under <em>Reviewed by</em>. Drag to move, use the
        corner or +/− to resize, then confirm it sits on the printed name.
      </>
    );
  }, [action]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex w-screen h-screen items-center justify-center bg-black/40 p-3 backdrop-blur-xs sm:p-4"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-1.5 w-full shrink-0 bg-[#4ec2bb]" />

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4f8]">
              <PenLine className="h-4 w-4 text-[#2a7797]" />
            </span>
            <div className="min-w-0">
              <h3
                id="signature-confirm-title"
                className="text-lg font-bold tracking-tight text-[#2a7797]"
              >
                {title}
              </h3>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {reportLabel ? `${reportLabel} · ` : ""}
                Last page
                {slot ? ` · ${SLOT_LABEL[slot]}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <p className="mb-3 text-xs leading-relaxed text-slate-500">{hint}</p>

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-slate-100 text-xs italic text-slate-400">
              Loading the last page…
            </div>
          ) : preview && rect && signatureUrl ? (
            <div
              tabIndex={0}
              onKeyDown={(event) => {
                if (isSaving) return;
                const step = event.shiftKey
                  ? SIGNATURE_FINE_NUDGE_PT
                  : SIGNATURE_NUDGE_PT;
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  nudge(0, step);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  nudge(0, -step);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudge(-step, 0);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudge(step, 0);
                }
              }}
              className="outline-none focus-visible:ring-2 focus-visible:ring-[#4ec2bb] rounded-2xl"
            >
              <SignaturePagePreview
                pdfBytes={preview.pdfBytes}
                pageWidth={preview.pageWidth}
                pageHeight={preview.pageHeight}
                rect={rect}
                signatureUrl={signatureUrl}
                aspectRatio={aspectRatio}
                disabled={isSaving}
                onRectChange={setRect}
              />
            </div>
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">
              {error ? "Preview unavailable." : "Nothing to preview."}
            </div>
          )}

          {preview && rect ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
                <IconButton
                  label="Move left"
                  disabled={isSaving}
                  onClick={() => nudge(-SIGNATURE_NUDGE_PT, 0)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={isSaving}
                  onClick={() => nudge(0, -SIGNATURE_NUDGE_PT)}
                >
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Move up"
                  disabled={isSaving}
                  onClick={() => nudge(0, SIGNATURE_NUDGE_PT)}
                >
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Move right"
                  disabled={isSaving}
                  onClick={() => nudge(SIGNATURE_NUDGE_PT, 0)}
                >
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
                <IconButton
                  label="Smaller"
                  disabled={isSaving}
                  onClick={() => bumpSize(-12)}
                >
                  <Minus className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Larger"
                  disabled={isSaving}
                  onClick={() => bumpSize(12)}
                >
                  <Plus className="h-4 w-4" />
                </IconButton>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setRect(preview.defaultRect)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <p className="text-[11px] text-slate-400">
                {Math.round(rect.width)} × {Math.round(rect.height)} pt
                {preview.pageCount > 1
                  ? ` · page ${preview.pageCount} of ${preview.pageCount}`
                  : ""}
              </p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}

          <label
            htmlFor={checkboxId}
            className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={confirmed}
              disabled={!preview || isSaving}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2a7797] focus:ring-[#4ec2bb]"
            />
            <span className="text-xs leading-relaxed text-slate-600">
              My signature is on the correct line and looks right. Apply it to
              the stored PDF.
            </span>
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            {isSaving ? "Applying…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
