"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Eye, X } from "lucide-react";
import { getServiceReportSignedUrl } from "@/lib/service-report-file";
import { PdfDocumentPages } from "./pdf-document-pages";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Staged local file, used when the PDF has not been stored yet. */
  file?: File | null;
  /** Stored object key; ignored when `file` is set. */
  filePath?: string | null;
  fileName?: string | null;
  title?: string;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  file = null,
  filePath = null,
  fileName = null,
  title = "Preview service report",
}: PdfPreviewModalProps) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const displayName = file?.name || fileName || "Service report.pdf";

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      setIsLoading(true);
      setError(null);
      setPdfBytes(null);
      setOpenUrl(null);

      try {
        let bytes: Uint8Array | null = null;

        if (file) {
          bytes = new Uint8Array(await file.arrayBuffer());
        } else {
          const path = filePath?.trim();
          if (!path) {
            setError("There is no PDF to preview.");
            setIsLoading(false);
            return;
          }
          const signed = await getServiceReportSignedUrl(path, fileName, {
            disposition: "inline",
          });
          if (cancelled) return;
          if (!signed) {
            setError("Couldn't open that PDF. Try again in a moment.");
            setIsLoading(false);
            return;
          }
          const response = await fetch(signed);
          if (!response.ok) {
            throw new Error("Couldn't download that PDF for preview.");
          }
          bytes = new Uint8Array(await response.arrayBuffer());
        }

        if (cancelled || !bytes) return;

        objectUrl = URL.createObjectURL(
          new Blob([bytes.slice()], { type: "application/pdf" }),
        );
        setPdfBytes(bytes);
        setOpenUrl(objectUrl);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
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
    };
  }, [file, fileName, filePath, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex w-screen h-screen items-center justify-center bg-black/40 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-1.5 w-full shrink-0 bg-[#4ec2bb]" />

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4f8]">
              <Eye className="h-4 w-4 text-[#2a7797]" />
            </span>
            <div className="min-w-0">
              <h3
                id="pdf-preview-title"
                className="text-lg font-bold tracking-tight text-[#2a7797]"
              >
                {title}
              </h3>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                {displayName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-6">
          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-slate-100 text-xs italic text-slate-400">
              Loading preview…
            </div>
          ) : pdfBytes ? (
            <PdfDocumentPages pdfBytes={pdfBytes} />
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">
              {error ?? "Nothing to preview."}
            </div>
          )}

          {error && pdfBytes ? (
            <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-black"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
