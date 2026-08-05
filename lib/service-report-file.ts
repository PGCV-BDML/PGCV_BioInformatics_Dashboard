import { supabase } from "@/lib/supabase";

/** Private bucket created in 20260806120001_service_report_storage.sql. */
export const SERVICE_REPORT_BUCKET = "service-reports";

/** Mirrors the bucket's own file_size_limit so the UI can fail fast. */
export const MAX_REPORT_BYTES = 25 * 1024 * 1024;

/**
 * Signed URLs are deliberately short-lived. A report is opened and read in
 * one sitting; a long-lived URL would outlive the reader's session and
 * become a way to share client data outside the dashboard.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export type ServiceReportFileMeta = {
  service_report_file_path: string;
  service_report_file_name: string;
  service_report_file_size: number;
  service_report_uploaded_at: string;
  service_report_uploaded_by: string | null;
};

export type ServiceReportFileSummary = {
  path: string | null;
  name: string | null;
  size: number | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
};

export function hasUploadedReport(
  file: Pick<ServiceReportFileSummary, "path"> | null | undefined,
): boolean {
  return Boolean(file?.path?.trim());
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Turn an arbitrary filename into something safe to use as an object key.
 * Storage keys allow a narrow character set, and the original name is kept
 * separately in `service_report_file_name` for display anyway.
 */
export function slugifyFileName(name: string): string {
  const withoutExtension = name.replace(/\.pdf$/i, "");
  const slug = withoutExtension
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return slug || "service-report";
}

/**
 * Uploads never reuse a key. A revision therefore leaves the version the
 * reviewer commented on in place, which matters when a comment says
 * "table 2 is wrong" and the table has since been renumbered.
 */
export function buildServiceReportPath(
  analysisId: string,
  fileName: string,
): string {
  return `${analysisId}/${Date.now()}-${slugifyFileName(fileName)}.pdf`;
}

/** Returns an error message, or null when the file is acceptable. */
export async function validateServiceReportPdf(
  file: File,
): Promise<string | null> {
  if (file.size === 0) {
    return "That file is empty.";
  }
  if (file.size > MAX_REPORT_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_REPORT_BYTES)}.`;
  }
  if (!/\.pdf$/i.test(file.name)) {
    return "Only PDF files can be uploaded as service reports.";
  }

  // The browser-reported MIME type comes from the OS and is trivially wrong
  // for files with a mangled extension, so check the actual header too.
  try {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const signature = String.fromCharCode(...header);
    if (signature !== "%PDF-") {
      return "That file isn't a valid PDF.";
    }
  } catch {
    return "Couldn't read that file. Try selecting it again.";
  }

  return null;
}

export async function uploadServiceReportPdf(options: {
  analysisId: string;
  file: File;
  uploadedBy: string | null;
}): Promise<ServiceReportFileMeta> {
  const { analysisId, file, uploadedBy } = options;

  const validationError = await validateServiceReportPdf(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = buildServiceReportPath(analysisId, file.name);

  const { error } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: false });

  if (error) {
    console.error("Failed to upload service report PDF:", error);
    throw new Error("Couldn't upload the report. Please try again.");
  }

  return {
    service_report_file_path: path,
    service_report_file_name: file.name,
    service_report_file_size: file.size,
    service_report_uploaded_at: new Date().toISOString(),
    service_report_uploaded_by: uploadedBy,
  };
}

export async function getServiceReportSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  const key = path?.trim();
  if (!key) return null;

  const { data, error } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Failed to sign service report URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

/**
 * Resolve whatever artifact a record has into something openable: the
 * uploaded PDF when there is one, otherwise the legacy pasted link.
 */
export async function resolveReportUrl(
  filePath: string | null | undefined,
  link: string | null | undefined,
): Promise<string | null> {
  if (filePath?.trim()) {
    const signed = await getServiceReportSignedUrl(filePath);
    if (signed) return signed;
  }
  return link?.trim() || null;
}

/**
 * Remove a stored PDF. Failures are logged rather than thrown: the record
 * pointing at the file is what the workflow reads, and leaving an orphaned
 * object behind is preferable to blocking the user's edit.
 */
export async function deleteServiceReportPdf(
  path: string | null | undefined,
): Promise<void> {
  const key = path?.trim();
  if (!key) return;

  const { error } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .remove([key]);

  if (error) {
    console.error("Failed to delete service report PDF:", error);
  }
}

/** Remove every stored PDF for an analysis, used when the record is deleted. */
export async function deleteAllServiceReportPdfs(
  analysisId: string,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .list(analysisId);

  if (error) {
    console.error("Failed to list service report PDFs:", error);
    return;
  }

  const keys = (data ?? []).map((entry) => `${analysisId}/${entry.name}`);
  if (keys.length === 0) return;

  const { error: removeError } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .remove(keys);

  if (removeError) {
    console.error("Failed to delete service report PDFs:", removeError);
  }
}
