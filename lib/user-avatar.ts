import { supabase } from "@/lib/supabase";

/** Public bucket created in 20260810110000_user_avatar_storage.sql. */
export const USER_AVATAR_BUCKET = "user-avatars";

/** Mirrors the bucket file_size_limit. */
export const MAX_AVATAR_BYTES = 1 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type AvatarSource = {
  avatar_path?: string | null;
  avatar_url?: string | null;
};

function extensionForMime(type: string): string {
  switch (type.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

function buildAvatarPath(userId: string, file: File): string {
  const ext = extensionForMime(file.type);
  return `${userId}/${Date.now()}-avatar.${ext}`;
}

async function assertCanManageAvatar(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to update a profile photo.");

  if (user.id === userId) return;

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to verify avatar permissions:", error);
    throw new Error("Couldn't verify permissions. Please try again.");
  }

  if (data?.role !== "team_lead") {
    throw new Error("You can only update your own profile photo.");
  }
}

export async function getUserAvatarPath(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load avatar path:", error);
    throw error;
  }

  return data?.avatar_path?.trim() || null;
}

/** Public URL for a stored avatar object key. */
export function getAvatarPublicUrl(path: string | null | undefined): string | null {
  const key = path?.trim();
  if (!key) return null;

  const { data } = supabase.storage.from(USER_AVATAR_BUCKET).getPublicUrl(key);
  return data.publicUrl || null;
}

/** Prefer uploaded storage avatars; fall back to legacy external URLs. */
export function resolveAvatarDisplayUrl(source: AvatarSource): string | null {
  const stored = getAvatarPublicUrl(source.avatar_path);
  if (stored) return stored;

  const legacy = source.avatar_url?.trim();
  if (legacy && /^https?:\/\//i.test(legacy)) return legacy;

  return null;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateAvatarImage(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_AVATAR_BYTES) {
    return "That file is too large. Keep profile photos under 1 MB.";
  }

  const type = file.type.toLowerCase();
  if (!ALLOWED_AVATAR_TYPES.has(type)) {
    return "Upload a JPEG, PNG, or WebP image.";
  }

  return null;
}

/**
 * Upload (or replace) a user's profile photo and persist the storage key.
 * The current user may update their own photo; team leads may update anyone's.
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatarImage(file);
  if (validationError) throw new Error(validationError);

  await assertCanManageAvatar(userId);

  const previousPath = await getUserAvatarPath(userId);
  const path = buildAvatarPath(userId, file);

  const { error: uploadError } = await supabase.storage
    .from(USER_AVATAR_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload avatar:", uploadError);
    throw new Error("Couldn't upload that photo. Please try again.");
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      avatar_path: path,
      avatar_url: null,
      avatar_uploaded_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to save avatar path:", updateError);
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([path]);
    throw new Error("Couldn't save your profile photo. Please try again.");
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([previousPath]);
  }

  return path;
}

/** Remove a user's uploaded profile photo (and any legacy URL). */
export async function removeUserAvatar(userId: string): Promise<void> {
  await assertCanManageAvatar(userId);

  const { data, error } = await supabase
    .from("users")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load avatar for removal:", error);
    throw new Error("Couldn't remove the profile photo. Please try again.");
  }

  const previousPath = data?.avatar_path?.trim() || null;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      avatar_path: null,
      avatar_url: null,
      avatar_uploaded_at: null,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to clear avatar fields:", updateError);
    throw new Error("Couldn't remove the profile photo. Please try again.");
  }

  if (previousPath) {
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([previousPath]);
  }
}
