"use client";

import { useState } from "react";
import { Send, Upload } from "lucide-react";
import { getCurrentUser, saveDataToDB } from "@/lib/supabase";
import {
  isChangesRequestedLabel,
  isRevisionRequestedLabel,
  needsReReviewAfterPdfReplace,
} from "@/lib/analysis-tracker";
import {
  resubmitForApproval,
  resubmitForReview,
} from "@/lib/notifications";
import { uploadServiceReportPdf } from "@/lib/service-report-file";
import PdfDropzone from "./pdf-dropzone";
import {
  AssigneeSignatureOption,
  AttachAssigneeSignatureButton,
} from "./assignee-signature-option";
import { useToast } from "./toast";

export type ServiceReportReplaceResult = {
  path: string;
  name: string;
  statusOfReview: string | null;
  notes: string | null;
};

interface ServiceReportReplaceProps {
  analysisId: string;
  filePath: string;
  statusOfReview: string | null;
  statusOfSubmission: string | null;
  /** Only show while the report is awaiting revision or changes. */
  enabled: boolean;
  onReplaced: (next: ServiceReportReplaceResult) => void;
  /** Called after a successful resubmission so the parent can refresh status. */
  onResubmitted?: (stage: "review" | "approval") => void;
  canStampPreparedBy?: boolean;
  onReadyToSign?: (analysisId: string) => void;
}

/**
 * Lets the assignee upload a new service-report PDF and resubmit in one place
 * after a reviewer or approver sends the record back.
 * The previous file stays in version history.
 */
export default function ServiceReportReplace({
  analysisId,
  filePath,
  statusOfReview,
  statusOfSubmission,
  enabled,
  onReplaced,
  onResubmitted,
  canStampPreparedBy = false,
  onReadyToSign,
}: ServiceReportReplaceProps) {
  const { showToast } = useToast();
  const hasStoredFile = Boolean(filePath.trim());
  const [isReplacing, setIsReplacing] = useState(!hasStoredFile);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [attachSignature, setAttachSignature] = useState(false);
  const [preparedByAlreadyStamped, setPreparedByAlreadyStamped] =
    useState(false);

  const awaitingRevision = isRevisionRequestedLabel(statusOfReview);
  const awaitingChanges = isChangesRequestedLabel(statusOfSubmission);
  const waitingOnReReview = needsReReviewAfterPdfReplace(
    statusOfReview,
    statusOfSubmission,
  );
  const canResubmit = awaitingRevision || (awaitingChanges && !waitingOnReReview);

  if (!enabled) return null;

  function resetStaging() {
    setPendingFile(null);
    setFileError(null);
    setAttachSignature(false);
    setPreparedByAlreadyStamped(false);
    setIsReplacing(!hasStoredFile);
  }

  async function handleUpload() {
    if (isUploading || !pendingFile) return;
    setIsUploading(true);
    setFileError(null);

    try {
      const user = await getCurrentUser();
      const uploaded = await uploadServiceReportPdf({
        analysisId,
        file: pendingFile,
        uploadedBy: user?.id ?? null,
      });

      const saved = await saveDataToDB("analysis", analysisId, {
        service_report_file_path: uploaded.service_report_file_path,
        service_report_file_name: uploaded.service_report_file_name,
        service_report_file_size: uploaded.service_report_file_size,
        service_report_uploaded_at: uploaded.service_report_uploaded_at,
        service_report_uploaded_by: uploaded.service_report_uploaded_by,
      });

      const nextStatusOfReview =
        typeof saved.status_of_review === "string"
          ? saved.status_of_review
          : null;
      const notes = typeof saved.notes === "string" ? saved.notes : null;

      onReplaced({
        path: uploaded.service_report_file_path,
        name: uploaded.service_report_file_name,
        statusOfReview: nextStatusOfReview,
        notes,
      });
      setPendingFile(null);
      setIsReplacing(false);
      showToast(
        attachSignature && !preparedByAlreadyStamped
          ? "New version uploaded. Place your signature under Prepared by."
          : String(nextStatusOfReview ?? "").trim().toLowerCase() === "for review"
            ? "New version uploaded. The reviewing officer will sign this version again."
            : "New version uploaded. Resubmit when ready.",
        "success",
      );
      if (attachSignature && !preparedByAlreadyStamped) {
        setAttachSignature(false);
        onReadyToSign?.(analysisId);
      }
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

  async function handleResubmit() {
    if (isResubmitting) return;
    setIsResubmitting(true);
    setResubmitError(null);
    try {
      if (awaitingRevision) {
        await resubmitForReview(analysisId);
        onResubmitted?.("review");
      } else {
        await resubmitForApproval(analysisId);
        onResubmitted?.("approval");
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't resubmit this report. Please try again.";
      setResubmitError(message);
      showToast(message, "error");
    } finally {
      setIsResubmitting(false);
    }
  }

  const resubmitLabel = isResubmitting
    ? "Resubmitting…"
    : awaitingRevision
      ? "Resubmit for review"
      : "Resubmit for approval";

  const dropzoneOpen = !hasStoredFile || isReplacing;
  const resubmitButton = canResubmit ? (
    <button
      type="button"
      onClick={() => void handleResubmit()}
      disabled={isResubmitting || isUploading || Boolean(pendingFile)}
      title={
        pendingFile
          ? "Upload the new PDF first, then resubmit."
          : undefined
      }
      className={
        dropzoneOpen
          ? "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-[#2a7797] text-[#2a7797] bg-white hover:bg-[#2a7797]/5 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold rounded-lg transition-all"
          : "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2a7797] hover:bg-[#1f5c76] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm"
      }
    >
      <Send className="w-3.5 h-3.5" aria-hidden="true" />
      {resubmitLabel}
    </button>
  ) : null;

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <p className="text-[11px] text-amber-900 leading-relaxed">
        {waitingOnReReview
          ? "Upload a new version if needed. The reviewing officer will sign this file again before approval can continue. The previous PDF stays on file."
          : hasStoredFile
            ? "Upload a new version if the comments require a new file, then resubmit. The previous PDF stays on file. A new file after peer review goes back to the reviewing officer to sign again."
            : "Upload the corrected service report PDF, then resubmit."}
      </p>

      {hasStoredFile && !isReplacing ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsReplacing(true);
              setPendingFile(null);
              setFileError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#2a7797] border border-[#2a7797]/30 rounded-lg hover:bg-white hover:border-[#2a7797] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Upload a new version
          </button>
          {canStampPreparedBy && onReadyToSign ? (
            <AttachAssigneeSignatureButton
              onClick={() => onReadyToSign(analysisId)}
              disabled={isUploading || isResubmitting}
            />
          ) : null}
          {resubmitButton}
        </div>
      ) : (
        <div className="space-y-2">
          <PdfDropzone
            file={pendingFile}
            onFileChange={(next) => {
              setPendingFile(next);
              setPreparedByAlreadyStamped(false);
            }}
            error={fileError}
            onError={setFileError}
            disabled={isUploading}
            label={hasStoredFile ? "New Service Report PDF" : "Service Report PDF"}
            enableSignaturePlacement={canStampPreparedBy}
            onSignatureApplied={(stamped) => {
              setPendingFile(stamped);
              setPreparedByAlreadyStamped(true);
              setAttachSignature(false);
            }}
          />
          <AssigneeSignatureOption
            checked={attachSignature}
            onChange={setAttachSignature}
            disabled={isUploading}
            visible={
              Boolean(pendingFile) &&
              canStampPreparedBy &&
              !preparedByAlreadyStamped
            }
          />
          {pendingFile && preparedByAlreadyStamped ? (
            <p className="text-[11px] font-semibold text-slate-500">
              Prepared by signature is on the last page of this PDF.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
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
            {resubmitButton}
          </div>
        </div>
      )}

      {resubmitError && (
        <p role="alert" className="text-xs text-red-600 font-semibold">
          {resubmitError}
        </p>
      )}
    </div>
  );
}
