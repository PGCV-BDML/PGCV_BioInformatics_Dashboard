"use client";

import { useEffect, useState } from "react";
import { FileUp } from "lucide-react";
import { supabase, saveDataToDB } from "@/lib/supabase";
import {
  uploadServiceReportPdf,
  type ServiceReportFileMeta,
} from "@/lib/service-report-file";
import PdfDropzone from "./pdf-dropzone";
import { AssigneeSignatureOption } from "./assignee-signature-option";
import { useToast } from "./toast";
import { canStampPreparedBy } from "@/lib/service-report-signature";

interface ServiceReportAnalysis {
  id: string;
  project_name: string;
  assignee_id?: string | null;
}

export interface ServiceReportUploadResult {
  file: ServiceReportFileMeta | null;
  link: string;
}

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ServiceReportAnalysis | null;
  currentUserId: string | null;
  /** Called after the report is stored and the list should be updated. */
  onReportUploaded: (
    analysisId: string,
    result: ServiceReportUploadResult,
  ) => void | Promise<void>;
  /** Opens the Prepared by signature placement modal after a successful save. */
  onReadyToSign?: (analysisId: string) => void;
}

export default function ServiceReportModal({
  isOpen,
  onClose,
  analysis,
  currentUserId,
  onReportUploaded,
  onReadyToSign,
}: ServiceReportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [clientAck, setClientAck] = useState(false);
  const [attachSignature, setAttachSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) return;
    setFile(null);
    setFallbackUrl("");
    setShowFallback(false);
    setClientAck(false);
    setAttachSignature(false);
    setError(null);
  }, [isOpen]);

  if (!isOpen || !analysis) return null;

  const trimmedUrl = fallbackUrl.trim();
  const canSubmit = Boolean(file);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !analysis || !currentUserId) return;
    if (!file) {
      setError("Attach the service report PDF to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const uploaded = await uploadServiceReportPdf({
        analysisId: analysis.id,
        file,
        uploadedBy: currentUserId,
      });

      const saved = await saveDataToDB("service_report", crypto.randomUUID(), {
        analysis_id: analysis.id,
        report_link: trimmedUrl || null,
        delivered_by: currentUserId,
        delivered_at: new Date().toISOString(),
        client_acknowledged_at: clientAck ? new Date().toISOString() : null,
      });

      await onReportUploaded(analysis.id, { file: uploaded, link: trimmedUrl });
      showToast(
        attachSignature
          ? "Report uploaded. Place your signature under Prepared by."
          : "Report uploaded.",
        "success",
      );
      const analysisId = analysis.id;
      const shouldSign = attachSignature;
      onClose();
      if (shouldSign) onReadyToSign?.(analysisId);

      supabase
        .rpc("audit_data_modification", {
          target_type: "service_report",
          target_id: (saved as { id: string })?.id ?? analysis.id,
          event_details: {
            action: "delivered",
            report_file: uploaded.service_report_file_path,
            report_link: trimmedUrl || null,
          },
        })
        .then(({ error: auditError }) => {
          if (auditError)
            console.error("audit_data_modification (deliver) failed:", auditError);
        });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save the report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="mb-5 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f4f8]">
            <FileUp className="w-4 h-4 text-[#2a7797]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900">
              Upload Service Report
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {analysis.project_name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PdfDropzone
            file={file}
            onFileChange={setFile}
            error={error}
            onError={setError}
            disabled={isSubmitting}
          />

          <p className="text-[11px] text-slate-500 leading-relaxed">
            This PDF is what the reviewing officer reads. Preview it first so
            you can confirm it is the right file. Once it is attached and both
            officers are assigned, the reviewer is notified automatically.
          </p>

          {file ? (
            <AssigneeSignatureOption
              checked={attachSignature}
              onChange={setAttachSignature}
              disabled={isSubmitting}
              visible={canStampPreparedBy(analysis.assignee_id, currentUserId)}
            />
          ) : null}

          {showFallback ? (
            <div>
              <label
                htmlFor="report-fallback-url"
                className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                Optional report URL
              </label>
              <input
                id="report-fallback-url"
                type="url"
                placeholder="e.g. https://drive.google.com/..."
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/50"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Optional Drive or share link kept alongside the PDF.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowFallback(true)}
              className="text-[11px] font-bold text-[#2a7797] hover:text-[#1f5c76] underline decoration-dotted"
            >
              Also add an optional Drive / share link
            </button>
          )}

          <div className="flex items-start gap-2.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <input
              type="checkbox"
              id="clientAck"
              checked={clientAck}
              onChange={(e) => setClientAck(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#2a7797] focus:ring-[#2a7797]"
            />
            <label
              htmlFor="clientAck"
              className="text-xs text-slate-600 cursor-pointer select-none"
            >
              <span className="font-semibold block text-slate-700">
                Client Acknowledged
              </span>
              Check this box if the client has already acknowledged receipt of
              delivery.
            </label>
          </div>

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
              disabled={isSubmitting || !canSubmit}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Uploading…" : "Save Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
