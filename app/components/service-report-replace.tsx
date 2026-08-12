"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { getCurrentUser, saveDataToDB } from "@/lib/supabase";
import {
  deleteServiceReportPdf,
  uploadServiceReportPdf,
} from "@/lib/service-report-file";
import PdfDropzone from "./pdf-dropzone";
import { useToast } from "./toast";

interface ServiceReportReplaceProps {
  analysisId: string;
  filePath: string;
  /** Only show while the report is awaiting revision or changes. */
  enabled: boolean;
  onReplaced: (next: { path: string; name: string }) => void;
}

/**
 * Lets the assignee replace the service-report PDF on the detail page
 * after a reviewer or approver sends the record back — without resubmitting.
 */
export default function ServiceReportReplace({
  analysisId,
  filePath,
  enabled,
  onReplaced,
}: ServiceReportReplaceProps) {
  const { showToast } = useToast();
  const hasStoredFile = Boolean(filePath.trim());
  const [isReplacing, setIsReplacing] = useState(!hasStoredFile);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!enabled) return null;

  function resetStaging() {
    setPendingFile(null);
    setFileError(null);
    setIsReplacing(!hasStoredFile);
  }

  async function handleUpload() {
    if (isUploading || !pendingFile) return;
    setIsUploading(true);
    setFileError(null);

    try {
      const user = await getCurrentUser();
      const previousPath = filePath.trim();
      const uploaded = await uploadServiceReportPdf({
        analysisId,
        file: pendingFile,
        uploadedBy: user?.id ?? null,
      });

      await saveDataToDB("analysis", analysisId, {
        service_report_file_path: uploaded.service_report_file_path,
        service_report_file_name: uploaded.service_report_file_name,
        service_report_file_size: uploaded.service_report_file_size,
        service_report_uploaded_at: uploaded.service_report_uploaded_at,
        service_report_uploaded_by: uploaded.service_report_uploaded_by,
      });

      if (
        previousPath &&
        previousPath !== uploaded.service_report_file_path
      ) {
        await deleteServiceReportPdf(previousPath);
      }

      onReplaced({
        path: uploaded.service_report_file_path,
        name: uploaded.service_report_file_name,
      });
      setPendingFile(null);
      setIsReplacing(false);
      showToast("PDF updated. Resubmit when ready.", "success");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't upload the report. Please try again.";
      setFileError(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <p className="text-[11px] text-amber-900 leading-relaxed">
        {hasStoredFile
          ? "Replace the PDF if the comments require a new file, then resubmit."
          : "Upload the corrected service report PDF, then resubmit."}
      </p>

      {hasStoredFile && !isReplacing ? (
        <button
          type="button"
          onClick={() => {
            setIsReplacing(true);
            setPendingFile(null);
            setFileError(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2a7797] underline decoration-dotted hover:text-[#1f5c76]"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          Replace with a new PDF
        </button>
      ) : (
        <div className="space-y-2">
          <PdfDropzone
            file={pendingFile}
            onFileChange={setPendingFile}
            error={fileError}
            onError={setFileError}
            disabled={isUploading}
            label={hasStoredFile ? "New Service Report PDF" : "Service Report PDF"}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={isUploading || !pendingFile}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2a7797] hover:bg-[#1f5c76] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              {isUploading ? "Uploading…" : "Upload PDF"}
            </button>
            {hasStoredFile ? (
              <button
                type="button"
                onClick={resetStaging}
                disabled={isUploading}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
