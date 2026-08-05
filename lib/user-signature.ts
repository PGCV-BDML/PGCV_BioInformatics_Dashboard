import { supabase } from "@/lib/supabase";

/** Private bucket created in 20260806130001_user_signature_storage.sql. */
export const USER_SIGNATURE_BUCKET = "user-signatures";

/** Mirrors the bucket file_size_limit. */
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export class MissingSignatureError extends Error {
  readonly code = "MISSING_SIGNATURE" as const;

  constructor(message = "Upload your electronic signature before continuing.") {
    super(message);
    this.name = "MissingSignatureError";
  }
}

export function isMissingSignatureError(
  error: unknown,
): error is MissingSignatureError {
  return (
    error instanceof MissingSignatureError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "MISSING_SIGNATURE")
  );
}

export async function getMySignaturePath(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("signature_path")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load signature path:", error);
    throw error;
  }

  return data?.signature_path?.trim() || null;
}

/** Throws MissingSignatureError when the current user has no e-sig on file. */
export async function requireMySignaturePath(): Promise<string> {
  const path = await getMySignaturePath();
  if (!path) throw new MissingSignatureError();
  return path;
}

export async function getUserSignaturePath(
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("signature_path")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user signature path:", error);
    throw error;
  }

  return data?.signature_path?.trim() || null;
}

export async function getSignatureSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  const key = path?.trim();
  if (!key) return null;

  const { data, error } = await supabase.storage
    .from(USER_SIGNATURE_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Failed to sign signature URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function downloadSignatureBytes(
  path: string,
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from(USER_SIGNATURE_BUCKET)
    .download(path);

  if (error || !data) {
    console.error("Failed to download signature:", error);
    throw new Error("Couldn't load your electronic signature.");
  }

  return new Uint8Array(await data.arrayBuffer());
}

/** Returns an error message, or null when the file is acceptable. */
export async function validateSignatureImage(
  file: File,
): Promise<string | null> {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_SIGNATURE_BYTES) {
    return "That file is too large. Keep signatures under 2 MB.";
  }

  const type = file.type.toLowerCase();
  if (type !== "image/png") {
    return "Upload a PNG image with a transparent background.";
  }

  return null;
}

function buildSignaturePath(userId: string, file: File): string {
  return `${userId}/${Date.now()}-signature.png`;
}

/**
 * Upload (or replace) the current user's e-signature image and persist
 * the storage key on their users row.
 */
export async function uploadMySignature(file: File): Promise<string> {
  const validationError = await validateSignatureImage(file);
  if (validationError) throw new Error(validationError);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to upload a signature.");

  const previousPath = await getMySignaturePath();
  const path = buildSignaturePath(user.id, file);

  const { error: uploadError } = await supabase.storage
    .from(USER_SIGNATURE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload signature:", uploadError);
    throw new Error("Couldn't upload that signature. Please try again.");
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      signature_path: path,
      signature_uploaded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to save signature path:", updateError);
    await supabase.storage.from(USER_SIGNATURE_BUCKET).remove([path]);
    throw new Error("Couldn't save your signature. Please try again.");
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(USER_SIGNATURE_BUCKET).remove([previousPath]);
  }

  return path;
}

export async function removeMySignature(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to remove a signature.");

  const previousPath = await getMySignaturePath();

  const { error } = await supabase
    .from("users")
    .update({
      signature_path: null,
      signature_uploaded_at: null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to clear signature path:", error);
    throw new Error("Couldn't remove your signature. Please try again.");
  }

  if (previousPath) {
    await supabase.storage.from(USER_SIGNATURE_BUCKET).remove([previousPath]);
  }
}
