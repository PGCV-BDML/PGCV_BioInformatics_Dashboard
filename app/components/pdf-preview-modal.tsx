"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  Minus,
  PenLine,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  downloadReportPdfBytes,
  extractLastPagePdf,
  prepareSignaturePreviewFromPdf,
  stampPdfBytes,
  type LocalSignaturePreview,
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
import MySignatureModal from "./my-signature-modal";
import { PdfLastPageCanvas } from "./pdf-last-page-canvas";
import { SignaturePagePreview } from "./signature-page-preview";

const SLOT_LABEL: Record<SignatureSlot, string> = {
  prepared_by: "Prepared by",
  reviewed_by: "Reviewed by",
  approved_by: "Approved for Release",
};

/** TS 5.9 BlobPart rejects Uint8Array<ArrayBufferLike>; slice() is ArrayBuffer-backed. */
function bytesForBlob(bytes: Uint8Array): BlobPart {
  return bytes.slice();
}

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Staged local file, used when the PDF has not been stored yet. */
  file?: File | null;
  /** Stored object key; ignored when `file` is set. */
  filePath?: string | null;
  fileName?: string | null;
  title?: string;
  /**
   * When set, overlay the current user's signature on the last page so they
   * can drag and resize it the same way reviewing/approving officers do.
   */
  signatureSlot?: SignatureSlot | null;
  /** Receives the locally stamped PDF after the user confirms placement. */
  onSignatureApplied?: (file: File) => void;
}

type LastPage = {
  pdfBytes: Uint8Array;
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
};

export default function PdfPreviewModal({
  isOpen,
  onClose,
  file = null,
  filePath = null,
  fileName = null,
  title = "Preview service report",
  signatureSlot = null,
  onSignatureApplied,
}: PdfPreviewModalProps) {
  const checkboxId = useId();
  const sourceBytesRef = useRef<Uint8Array | null>(null);
  const [lastPage, setLastPage] = useState<LastPage | null>(null);
  const [preview, setPreview] = useState<LocalSignaturePreview | null>(null);
  const [rect, setRect] = useState<SignatureRect | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [signaturePromptOpen, setSignaturePromptOpen] = useState(false);
  const [signatureRetry, setSignatureRetry] = useState(0);

  const displayName = file?.name || fileName || "Service report.pdf";
  const canPlaceSignature = Boolean(signatureSlot && onSignatureApplied);
  const page = preview
    ? { width: preview.pageWidth, height: preview.pageHeight }
    : lastPage
      ? { width: lastPage.pageWidth, height: lastPage.pageHeight }
      : null;
  const aspectRatio = preview
    ? preview.imageWidth / Math.max(preview.imageHeight, 1)
    : 4;

  useEffect(() => {
    if (!isOpen) {
      sourceBytesRef.current = null;
      setLastPage(null);
      setPreview(null);
      setRect(null);
      setSignatureUrl(null);
      setFullUrl(null);
      setError(null);
      setIsLoading(true);
      setConfirmed(false);
      setIsSaving(false);
      setSignaturePromptOpen(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    let stampUrl: string | null = null;

    void (async () => {
      setIsLoading(true);
      setError(null);
      setLastPage(null);
      setPreview(null);
      setRect(null);
      setSignatureUrl(null);
      setFullUrl(null);
      setConfirmed(false);

      try {
        let bytes: Uint8Array;
        if (file) {
          bytes = new Uint8Array(await file.arrayBuffer());
        } else {
          const path = filePath?.trim();
          if (!path) {
            if (!cancelled) {
              setError("There is no PDF to preview.");
              setIsLoading(false);
            }
            return;
          }
          bytes = await downloadReportPdfBytes(path);
        }
        if (cancelled) return;
        sourceBytesRef.current = bytes;

        const extracted = await extractLastPagePdf(bytes);
        if (cancelled) return;
        setLastPage(extracted);

        objectUrl = URL.createObjectURL(
          new Blob([bytesForBlob(bytes)], { type: "application/pdf" }),
        );
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setFullUrl(objectUrl);

        if (canPlaceSignature && signatureSlot) {
          try {
            const next = await prepareSignaturePreviewFromPdf(
              bytes,
              signatureSlot,
            );
            if (cancelled) return;
            stampUrl = URL.createObjectURL(
              new Blob([bytesForBlob(next.signatureBytes)], {
                type: "image/png",
              }),
            );
            if (cancelled) {
              URL.revokeObjectURL(stampUrl);
              return;
            }
            setPreview(next);
            setRect(next.defaultRect);
            setSignatureUrl(stampUrl);
          } catch (err) {
            if (cancelled) return;
            if (isMissingSignatureError(err)) {
              setSignaturePromptOpen(true);
            } else {
              throw err;
            }
          }
        }

        if (!cancelled) setIsLoading(false);
      } catch (err) {
        console.error(err);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        if (stampUrl) URL.revokeObjectURL(stampUrl);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't open that PDF. Try again in a moment.",
          );
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (stampUrl) URL.revokeObjectURL(stampUrl);
    };
  }, [canPlaceSignature, file, fileName, filePath, isOpen, signatureRetry, signatureSlot]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isSaving) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, isSaving, onClose]);

  const canSubmit = Boolean(
    canPlaceSignature &&
      preview &&
      rect &&
      confirmed &&
      !isSaving &&
      !isLoading,
  );

  const nudge = (dx: number, dy: number) => {
    if (!rect || !page) return;
    setRect(nudgeSignatureRect(rect, dx, dy, page, aspectRatio));
  };

  const bumpSize = (delta: number) => {
    if (!rect || !page) return;
    setRect(resizeSignatureRect(rect, rect.width + delta, page, aspectRatio));
  };

  async function handleAttachSignature() {
    if (!canSubmit || !rect || !preview || !signatureSlot || !onSignatureApplied) {
      return;
    }
    const source = sourceBytesRef.current;
    if (!source) return;
    setIsSaving(true);
    setError(null);
    try {
      const stamped = await stampPdfBytes(
        source,
        preview.signatureBytes,
        signatureSlot,
        rect,
      );
      onSignatureApplied(
        new File([bytesForBlob(stamped)], displayName, {
          type: "application/pdf",
        }),
      );
      onClose();
    } catch (err) {
      console.error(err);
      if (isMissingSignatureError(err)) {
        setSignaturePromptOpen(true);
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
    if (!canPlaceSignature || !signatureSlot) {
      return (
        <>
          Signatures live on this last page. Drag is available when you are
          placing your e-signature. Open the full report if you need earlier
          pages.
        </>
      );
    }
    return (
      <>
        This stamp goes under <em>{SLOT_LABEL[signatureSlot]}</em>. Drag to
        move, use the corner or +/− to resize, then confirm it sits on the
        printed name — the same placement officers use.
      </>
    );
  }, [canPlaceSignature, signatureSlot]);

  if (!isOpen) return null;

  const heading = canPlaceSignature
    ? "Place your signature"
    : title;
  const pageCount = preview?.pageCount ?? lastPage?.pageCount ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex w-screen h-screen items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-xl"
      >
        <div className="h-1.5 w-full shrink-0 bg-[#4ec2bb]" />

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4f8]">
              {canPlaceSignature ? (
                <PenLine className="h-4 w-4 text-[#2a7797]" />
              ) : (
                <Eye className="h-4 w-4 text-[#2a7797]" />
              )}
            </span>
            <div className="min-w-0">
              <h3
                id="pdf-preview-title"
                className="text-lg font-bold tracking-tight text-[#2a7797]"
              >
                {heading}
              </h3>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {displayName}
                {pageCount > 1 ? ` · last page of ${pageCount}` : " · Last page"}
                {signatureSlot ? ` · ${SLOT_LABEL[signatureSlot]}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close preview"
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
          ) : lastPage ? (
            <PdfLastPageCanvas
              pdfBytes={lastPage.pdfBytes}
              pageWidth={lastPage.pageWidth}
              pageHeight={lastPage.pageHeight}
            />
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">
              {error ?? "Nothing to preview."}
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

          {canPlaceSignature && !preview && !isLoading ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-amber-950">
                Upload your e-signature to drag and resize it on this last page,
                the same way reviewing and approving officers do.
              </p>
              <button
                type="button"
                onClick={() => setSignaturePromptOpen(true)}
                className="mt-2 text-[11px] font-bold text-[#2a7797] underline decoration-dotted hover:text-[#1f5c76]"
              >
                Upload my signature
              </button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}

          {canPlaceSignature && preview ? (
            <label
              htmlFor={checkboxId}
              className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
            >
              <input
                id={checkboxId}
                type="checkbox"
                checked={confirmed}
                disabled={isSaving}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2a7797] focus:ring-[#4ec2bb]"
              />
              <span className="text-xs leading-relaxed text-slate-600">
                My signature is on the correct line and looks right. Apply it to
                this PDF before it is saved.
              </span>
            </label>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            {canPlaceSignature ? "Cancel" : "Close"}
          </button>
          {fullUrl ? (
            <>
              <a
                href={fullUrl}
                download={displayName}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open full report
              </a>
            </>
          ) : null}
          {canPlaceSignature ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleAttachSignature()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {isSaving ? "Applying…" : "Attach signature"}
            </button>
          ) : null}
        </div>
      </div>

      <MySignatureModal
        isOpen={signaturePromptOpen}
        elevated
        requiredForAction={canPlaceSignature}
        onClose={() => setSignaturePromptOpen(false)}
        onUploaded={() => {
          setSignaturePromptOpen(false);
          setSignatureRetry((n) => n + 1);
        }}
      />
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
