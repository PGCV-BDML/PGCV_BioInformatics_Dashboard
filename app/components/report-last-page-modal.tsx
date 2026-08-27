"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileCheck2, X } from "lucide-react";
import {
  isMissingReportPdfError,
  prepareReportLastPagePreview,
  type LastPagePreview,
} from "@/lib/service-report-signature";
import { resolveReportUrl } from "@/lib/service-report-file";
import { PdfLastPageCanvas } from "./pdf-last-page-canvas";

interface ReportLastPageModalProps {
  isOpen: boolean;
  analysisId: string | null;
  reportLabel?: string;
  filePath?: string | null;
  fileName?: string | null;
  fileLink?: string | null;
  onClose: () => void;
}

export default function ReportLastPageModal({
  isOpen,
  analysisId,
  reportLabel,
  filePath,
  fileName,
  fileLink,
  onClose,
}: ReportLastPageModalProps) {
  const [preview, setPreview] = useState<LastPagePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningFull, setIsOpeningFull] = useState(false);

  useEffect(() => {
    if (!isOpen || !analysisId) return;

    let cancelled = false;

    void (async () => {
      try {
        const next = await prepareReportLastPagePreview(analysisId);
        if (cancelled) return;
        setPreview(next);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setError(
          isMissingReportPdfError(err)
            ? err.message
            : err instanceof Error
              ? err.message
              : "Couldn't load the last page of this report.",
        );
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleOpenFullReport() {
    setIsOpeningFull(true);
    try {
      const url = await resolveReportUrl(
        filePath || preview?.filePath,
        fileLink,
        fileName ?? preview?.fileName,
      );
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setError("Couldn't open the full report file.");
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't open the full report file.");
    } finally {
      setIsOpeningFull(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex w-screen h-screen items-center justify-center bg-black/40 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-last-page-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-1.5 w-full shrink-0 bg-[#4ec2bb]" />

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4f8]">
              <FileCheck2 className="h-4 w-4 text-[#2a7797]" />
            </span>
            <div className="min-w-0">
              <h3
                id="report-last-page-title"
                className="text-lg font-bold tracking-tight text-[#2a7797]"
              >
                Signed report
              </h3>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {reportLabel ? `${reportLabel} · ` : ""}
                Last page
                {preview && preview.pageCount > 1
                  ? ` · page ${preview.pageCount} of ${preview.pageCount}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            Officer signatures are stamped on this last page. Open the full
            report if you need the earlier pages.
          </p>

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-slate-100 text-xs italic text-slate-400">
              Loading the last page…
            </div>
          ) : preview ? (
            <PdfLastPageCanvas
              pdfBytes={preview.pdfBytes}
              pageWidth={preview.pageWidth}
              pageHeight={preview.pageHeight}
            />
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">
              {error ? "Preview unavailable." : "Nothing to preview."}
            </div>
          )}

          {error ? (
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
          <button
            type="button"
            disabled={isOpeningFull}
            onClick={() => void handleOpenFullReport()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isOpeningFull ? "Opening…" : "Open full report"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
