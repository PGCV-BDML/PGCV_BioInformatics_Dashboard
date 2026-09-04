"use client";

import { useId, useRef, useState } from "react";
import { Eye, FileText, Upload, X } from "lucide-react";
import {
  MAX_REPORT_BYTES,
  formatFileSize,
  validateServiceReportPdf,
} from "@/lib/service-report-file";
import PdfPreviewModal from "./pdf-preview-modal";

interface PdfDropzoneProps {
  /** The file staged for upload, or null when nothing is selected. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Surfaced under the control; the parent owns upload errors. */
  error?: string | null;
  onError?: (message: string | null) => void;
  disabled?: boolean;
  label?: string;
}

export default function PdfDropzone({
  file,
  onFileChange,
  error,
  onError,
  disabled = false,
  label = "Service Report PDF",
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputId = useId();

  async function accept(candidate: File | undefined) {
    if (!candidate) return;
    const validationError = await validateServiceReportPdf(candidate);
    if (validationError) {
      onError?.(validationError);
      onFileChange(null);
      return;
    }
    onError?.(null);
    onFileChange(candidate);
    setPreviewOpen(true);
  }

  function openNativePreview() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const tab = window.open(url, "_blank");
    if (!tab) setPreviewOpen(true);
  }

  function clear() {
    onError?.(null);
    onFileChange(null);
    setPreviewOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-bold text-slate-800 ml-1 font-aileron"
      >
        {label}
      </label>

      {file ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-[#4ec2bb]/50 bg-[#e6f7f5] px-3.5 py-2.5">
            <FileText className="w-4 h-4 shrink-0 text-[#2a7797]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">
                {file.name}
              </p>
              <p className="text-[10px] text-slate-500">
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              aria-label="Remove selected file"
              className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                openNativePreview();
                setPreviewOpen(true);
              }}
              disabled={disabled}
              title="Preview this PDF"
              aria-label="Preview this PDF"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2a7797] px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1f5c76] disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview PDF
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            void accept(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
            isDragging
              ? "border-[#4ec2bb] bg-[#e6f7f5]"
              : "border-slate-300 bg-slate-50"
          } ${disabled ? "opacity-60" : ""}`}
        >
          <Upload className="w-4 h-4 text-slate-400" />
          <p className="text-[11px] font-bold text-slate-600">
            Drop the PDF here, or{" "}
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="text-[#2a7797] underline decoration-dotted hover:text-[#1f5c76] disabled:no-underline"
            >
              browse
            </button>
          </p>
          <p className="text-[10px] text-slate-400">
            PDF only, up to {formatFileSize(MAX_REPORT_BYTES)}
          </p>
        </div>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled}
        onChange={(e) => void accept(e.target.files?.[0])}
        className="sr-only"
      />

      {error && (
        <p className="ml-1 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}

      <PdfPreviewModal
        isOpen={previewOpen && Boolean(file)}
        file={file}
        fileName={file?.name}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
