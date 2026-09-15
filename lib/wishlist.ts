import { formatDate } from "@/lib/utils";
import { isStaffRole } from "@/lib/portal";
import type {
  UserRole,
  WishlistCategory,
  WishlistItem,
  WishlistItemFormData,
  WishlistStatus,
} from "@/types/database";
import {
  WISHLIST_CATEGORY_OPTIONS,
  WISHLIST_STATUS_OPTIONS,
} from "@/types/database";

export function emptyWishlistForm(): WishlistItemFormData {
  return {
    title: "",
    description: "",
    category: "equipment",
    status: "requested",
    quantity: 1,
    estimated_cost: "",
    vendor_or_link: "",
    notes: "",
  };
}

export function formFromWishlistItem(row: WishlistItem): WishlistItemFormData {
  return {
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    status: row.status,
    quantity: row.quantity,
    estimated_cost:
      row.estimated_cost == null ? "" : String(row.estimated_cost),
    vendor_or_link: row.vendor_or_link ?? "",
    notes: row.notes ?? "",
  };
}

export function parseWishlistCost(
  value: string | null | undefined,
): number | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function normalizeWishlistQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function buildWishlistItemPayload(
  form: WishlistItemFormData,
): Omit<WishlistItem, "id" | "requester_id" | "created_at" | "updated_at"> {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    category: form.category,
    status: form.status,
    quantity: normalizeWishlistQuantity(form.quantity),
    estimated_cost: parseWishlistCost(form.estimated_cost),
    vendor_or_link: form.vendor_or_link.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export function buildWishlistNotesPayload(
  form: WishlistItemFormData,
): Pick<WishlistItem, "notes"> {
  return { notes: form.notes.trim() || null };
}

export function buildWishlistStatusNotesPayload(
  form: WishlistItemFormData,
): Pick<WishlistItem, "status" | "notes"> {
  return {
    status: form.status,
    notes: form.notes.trim() || null,
  };
}

export function canAddWishlistItem(
  role: UserRole | null | undefined,
): boolean {
  return isStaffRole(role);
}

export function canManageWishlistItem(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  requesterId: string,
): boolean {
  if (role === "team_lead") return true;
  return role === "team_member" && Boolean(userId) && userId === requesterId;
}

export function canChangeWishlistStatus(
  role: UserRole | null | undefined,
): boolean {
  return isStaffRole(role);
}

export function canEditWishlistNotes(
  role: UserRole | null | undefined,
): boolean {
  return isStaffRole(role) || role === "approving_officer";
}

export function canDeleteWishlistItem(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  requesterId: string,
): boolean {
  return canManageWishlistItem(role, userId, requesterId);
}

export function isReceivedWishlistStatus(
  status: WishlistStatus | null | undefined,
): boolean {
  return status === "received";
}

export function wishlistCategoryLabel(value: WishlistCategory): string {
  return (
    WISHLIST_CATEGORY_OPTIONS.find((opt) => opt.value === value)?.label ??
    value
  );
}

export function wishlistStatusLabel(value: WishlistStatus): string {
  return (
    WISHLIST_STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? value
  );
}

export function formatWishlistAdded(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  return formatDate(datePart) || "—";
}
