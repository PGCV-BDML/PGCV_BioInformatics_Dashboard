import { supabase } from "@/lib/supabase";

/** Private bucket created in 20260812160000_onboarding_document_storage.sql. */
export const ONBOARDING_DOCUMENTS_BUCKET = "onboarding-documents";

/** Mirrors the bucket's own file_size_limit so the UI can fail fast. */
export const MAX_ONBOARDING_FILE_BYTES = 25 * 1024 * 1024;

const SIGNED_URL_TTL_SECONDS = 60 * 10;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".txt",
]);

export type OnboardingFileMeta = {
  file_path: string;
  file_name: string;
  file_size: number;
};

export function formatOnboardingFileSize(
  bytes: number | null | undefined,
): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function hasUploadedOnboardingFile(
  path: string | null | undefined,
): boolean {
  return Boolean(path?.trim());
}

function fileExtension(name: string): string {
  const match = /\.[^.]+$/.exec(name.trim().toLowerCase());
  return match?.[0] ?? "";
}

function slugifyFileBase(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, "");
  const slug = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "document";
}

export function buildOnboardingDocumentPath(
  programId: string,
  fileName: string,
): string {
  const ext = fileExtension(fileName) || ".bin";
  const slug = slugifyFileBase(fileName);
  return `${programId}/${Date.now()}-${slug}${ext}`;
}

export function validateOnboardingDocumentFile(file: File): string | null {
  if (file.size <= 0) {
    return "That file looks empty. Please choose another document.";
  }
  if (file.size > MAX_ONBOARDING_FILE_BYTES) {
    return `That file is ${formatOnboardingFileSize(file.size)}. The limit is ${formatOnboardingFileSize(MAX_ONBOARDING_FILE_BYTES)}.`;
  }

  const ext = fileExtension(file.name);
  const mimeOk = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return "Upload a PDF, Word document, PNG, JPEG, or text file.";
  }

  return null;
}

export function validateExternalDocumentLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Paste a document link.";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Links must start with http:// or https://.";
    }
  } catch {
    return "That does not look like a valid link.";
  }
  return null;
}

export async function uploadOnboardingDocumentFile(options: {
  programId: string;
  file: File;
}): Promise<OnboardingFileMeta> {
  const { programId, file } = options;

  const validationError = validateOnboardingDocumentFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = buildOnboardingDocumentPath(programId, file.name);
  const { error } = await supabase.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("Failed to upload onboarding document:", error);
    throw new Error("Couldn't upload the document. Please try again.");
  }

  return {
    file_path: path,
    file_name: file.name,
    file_size: file.size,
  };
}

export async function getOnboardingDocumentSignedUrl(
  path: string | null | undefined,
  fileName?: string | null,
): Promise<string | null> {
  const key = path?.trim();
  if (!key) return null;

  const downloadName =
    fileName?.trim() || key.split("/").pop() || "onboarding-document";

  const { data, error } = await supabase.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS, {
      download: downloadName,
    });

  if (error) {
    console.error("Failed to sign onboarding document URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function deleteOnboardingDocumentFile(
  path: string | null | undefined,
): Promise<void> {
  const key = path?.trim();
  if (!key) return;

  const { error } = await supabase.storage
    .from(ONBOARDING_DOCUMENTS_BUCKET)
    .remove([key]);

  if (error) {
    console.error("Failed to delete onboarding document file:", error);
    throw new Error("Couldn't remove the uploaded file. Please try again.");
  }
}

/**
 * Prefer the uploaded file when present; otherwise open the external link.
 */
export async function resolveOnboardingDocumentHref(doc: {
  link?: string | null;
  file_path?: string | null;
  file_name?: string | null;
}): Promise<string | null> {
  if (hasUploadedOnboardingFile(doc.file_path)) {
    return getOnboardingDocumentSignedUrl(doc.file_path, doc.file_name);
  }
  const link = doc.link?.trim();
  return link || null;
}
