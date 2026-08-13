import { supabase } from "@/lib/supabase";

/** Private bucket created in 20260813140000_module_file_storage.sql. */
export const MODULE_FILES_BUCKET = "module-files";

/** Mirrors the bucket's own file_size_limit so the UI can fail fast. */
export const MAX_MODULE_FILE_BYTES = 50 * 1024 * 1024;

const SIGNED_URL_TTL_SECONDS = 60 * 10;

const MIME_BY_EXT: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".zip": "application/zip",
};

const ALLOWED_MIME_TYPES = new Set([
  ...Object.values(MIME_BY_EXT),
  "application/x-zip-compressed",
]);

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME_BY_EXT));

export const MODULE_FILE_ACCEPT =
  ".html,.htm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.zip";

export type ModuleFileMeta = {
  file_path: string;
  file_name: string;
  file_size: number;
};

export function formatModuleFileSize(
  bytes: number | null | undefined,
): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function hasUploadedModuleFile(
  path: string | null | undefined,
): boolean {
  return Boolean(path?.trim());
}

export function titleFromModuleFileName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, "").trim();
  const spaced = withoutExt.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced || "Uploaded module";
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
  return slug || "module";
}

export function contentTypeForModuleFile(file: File): string {
  const ext = fileExtension(file.name);
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  return "application/octet-stream";
}

export function buildModuleFilePath(
  programId: string,
  fileName: string,
): string {
  const ext = fileExtension(fileName) || ".bin";
  const slug = slugifyFileBase(fileName);
  return `${programId}/${Date.now()}-${slug}${ext}`;
}

export function validateModuleFile(file: File): string | null {
  if (file.size <= 0) {
    return "That file looks empty. Please choose another file.";
  }
  if (file.size > MAX_MODULE_FILE_BYTES) {
    return `That file is ${formatModuleFileSize(file.size)}. The limit is ${formatModuleFileSize(MAX_MODULE_FILE_BYTES)}.`;
  }

  const ext = fileExtension(file.name);
  const mimeOk = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return "Upload an HTML, PDF, Word, PowerPoint, Excel, CSV, PNG, JPEG, text, or ZIP file.";
  }

  return null;
}

export async function uploadModuleFile(options: {
  programId: string;
  file: File;
}): Promise<ModuleFileMeta> {
  const { programId, file } = options;

  const validationError = validateModuleFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = buildModuleFilePath(programId, file.name);
  const { error } = await supabase.storage
    .from(MODULE_FILES_BUCKET)
    .upload(path, file, {
      contentType: contentTypeForModuleFile(file),
      upsert: false,
    });

  if (error) {
    console.error("Failed to upload module file:", error);
    throw new Error("Couldn't upload the file. Please try again.");
  }

  return {
    file_path: path,
    file_name: file.name,
    file_size: file.size,
  };
}

export async function getModuleFileSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  const key = path?.trim();
  if (!key) return null;

  const { data, error } = await supabase.storage
    .from(MODULE_FILES_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Failed to sign module file URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function deleteModuleFile(
  path: string | null | undefined,
): Promise<void> {
  const key = path?.trim();
  if (!key) return;

  const { error } = await supabase.storage
    .from(MODULE_FILES_BUCKET)
    .remove([key]);

  if (error) {
    console.error("Failed to delete module file:", error);
    throw new Error("Couldn't remove the uploaded file. Please try again.");
  }
}

/**
 * Prefer an uploaded file when present; otherwise open the library HTML path.
 */
export async function resolveModuleHref(module: {
  html_content_link?: string | null;
  file_path?: string | null;
}): Promise<string | null> {
  if (hasUploadedModuleFile(module.file_path)) {
    return getModuleFileSignedUrl(module.file_path);
  }
  const html = module.html_content_link?.trim();
  return html || null;
}
