import { PDFDocument } from "pdf-lib";
import { supabase, getCurrentUser } from "@/lib/supabase";
import {
  buildServiceReportPath,
  SERVICE_REPORT_BUCKET,
  stampedServiceReportFileName,
} from "@/lib/service-report-file";
import {
  downloadSignatureBytes,
  MissingSignatureError,
  requireMySignaturePath,
} from "@/lib/user-signature";
import { isReviewComplete } from "@/lib/analysis-tracker";

/**
 * Signature image placement on the last page of a PGCV service report.
 *
 * Coordinates use PDF points with origin at the bottom-left of the page
 * (pdf-lib convention). Tuned for the standard A4 signatory page with
 * Prepared by / Reviewed by / Approved for Release blocks — adjust here
 * if the Word template margins change.
 */
export type SignatureSlot = "reviewed_by" | "approved_by";

type SlotPlacement = {
  /** Left edge of the signature image. */
  x: number;
  /** Bottom edge of the signature image. */
  y: number;
  /** Drawn width; height scales to preserve aspect ratio, capped below. */
  maxWidth: number;
  maxHeight: number;
};

/**
 * Calibrated against the standard PGCV service-report signatory page
 * (Prepared by / Reviewed by / Approved for Release on the last page).
 *
 * Each stamp sits in the blank band between the role label and the
 * printed name — the same spot the analyst's Prepared-by signature uses.
 * pdf-lib y is the bottom edge of the image (origin = page bottom-left).
 */
export const SIGNATURE_SLOTS: Record<SignatureSlot, SlotPlacement> = {
  reviewed_by: {
    x: 72,
    y: 441, // 498 − 2cm (≈56.7pt)
    maxWidth: 160,
    maxHeight: 44,
  },
  approved_by: {
    x: 72,
    y: 241, // 298 − 2cm (≈56.7pt)
    maxWidth: 160,
    maxHeight: 44,
  },
};

export {
  originalServiceReportBaseName,
  serviceReportDownloadFileName,
  stampedServiceReportFileName,
} from "@/lib/service-report-file";

export class MissingReportPdfError extends Error {
  readonly code = "MISSING_REPORT_PDF" as const;

  constructor(
    message = "This report has no uploaded PDF to sign. Ask the analyst to upload one.",
  ) {
    super(message);
    this.name = "MissingReportPdfError";
  }
}

export function isMissingReportPdfError(
  error: unknown,
): error is MissingReportPdfError {
  return (
    error instanceof MissingReportPdfError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "MISSING_REPORT_PDF")
  );
}

async function downloadReportPdfBytes(path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .download(path);

  if (error || !data) {
    console.error("Failed to download service report PDF:", error);
    throw new Error("Couldn't open the service report PDF for signing.");
  }

  return new Uint8Array(await data.arrayBuffer());
}

function fitSignatureSize(
  imageWidth: number,
  imageHeight: number,
  slot: SlotPlacement,
): { width: number; height: number } {
  const ratio = imageWidth / Math.max(imageHeight, 1);
  let width = slot.maxWidth;
  let height = width / ratio;
  if (height > slot.maxHeight) {
    height = slot.maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

/**
 * Draw the current user's e-signature into the named slot on the last
 * page of the analysis PDF, upload a new version, and point the analysis
 * row at it. Does not change review/approval status — callers do that.
 */
export async function stampServiceReportSignature(
  analysisId: string,
  slot: SignatureSlot,
): Promise<{ filePath: string; fileName: string; fileSize: number }> {
  const signaturePath = await requireMySignaturePath();

  const { data: analysis, error } = await supabase
    .from("analysis")
    .select(
      "id, service_report_file_path, service_report_file_name, reviewer_user_id, approver_user_id, status_of_review",
    )
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load analysis for signing:", error);
    throw error;
  }
  if (!analysis) {
    throw new Error("Analysis not found for signing.");
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new MissingSignatureError("You must be signed in to sign a report.");
  }

  if (slot === "reviewed_by" && analysis.reviewer_user_id !== user.id) {
    throw new Error("Only the assigned reviewing officer can sign this report.");
  }
  if (slot === "approved_by" && analysis.approver_user_id !== user.id) {
    throw new Error("Only the assigned approving officer can sign this report.");
  }
  if (slot === "approved_by" && !isReviewComplete(analysis.status_of_review)) {
    throw new Error(
      "This report must be peer-reviewed before it can be approved.",
    );
  }

  const reportPath = analysis.service_report_file_path?.trim();
  if (!reportPath) {
    throw new MissingReportPdfError();
  }

  const [pdfBytes, signatureBytes] = await Promise.all([
    downloadReportPdfBytes(reportPath),
    downloadSignatureBytes(signaturePath),
  ]);

  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  if (pages.length === 0) {
    throw new Error("That PDF has no pages to sign.");
  }
  const page = pages[pages.length - 1]!;
  const placement = SIGNATURE_SLOTS[slot];

  // Prefer PNG; fall back to embedding as is (webp may fail — callers upload PNG).
  let embedded;
  try {
    embedded = await pdf.embedPng(signatureBytes);
  } catch {
    try {
      embedded = await pdf.embedJpg(signatureBytes);
    } catch {
      throw new Error(
        "Couldn't read your signature image. Re-upload it as a PNG.",
      );
    }
  }

  const size = fitSignatureSize(
    embedded.width,
    embedded.height,
    placement,
  );

  page.drawImage(embedded, {
    x: placement.x,
    y: placement.y,
    width: size.width,
    height: size.height,
  });

  const stamped = await pdf.save();
  const stampedBytes = new Uint8Array(stamped);
  const stampedName = stampedServiceReportFileName(
    analysis.service_report_file_name,
    slot,
  );
  const newPath = buildServiceReportPath(analysisId, stampedName);

  const { error: uploadError } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .upload(newPath, stampedBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload stamped PDF:", uploadError);
    throw new Error("Couldn't save the signed PDF. Please try again.");
  }

  const { error: setFileError } = await supabase.rpc("set_analysis_report_file", {
    p_analysis_id: analysisId,
    p_file_path: newPath,
    p_file_name: stampedName,
    p_file_size: stampedBytes.byteLength,
  });

  if (setFileError) {
    console.error("Failed to update analysis report file:", setFileError);
    throw new Error("Couldn't save the signed PDF. Please try again.");
  }

  return {
    filePath: newPath,
    fileName: stampedName,
    fileSize: stampedBytes.byteLength,
  };
}
