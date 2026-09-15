import { describe, expect, it } from "vitest";
import {
  buildWishlistItemPayload,
  buildWishlistNotesPayload,
  buildWishlistStatusNotesPayload,
  canAddWishlistItem,
  canChangeWishlistStatus,
  canDeleteWishlistItem,
  canEditWishlistNotes,
  canManageWishlistItem,
  emptyWishlistForm,
  formFromWishlistItem,
  formatWishlistAdded,
  parseWishlistCost,
  wishlistCategoryLabel,
  wishlistStatusLabel,
} from "./wishlist";
import type { WishlistItem } from "@/types/database";

function row(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: "wish-1",
    title: "HDMI cable",
    description: "2m, with USB-C adapter",
    category: "equipment",
    status: "requested",
    quantity: 2,
    estimated_cost: 450,
    vendor_or_link: "https://example.com/hdmi",
    requester_id: "user-1",
    notes: "Also need a spare.",
    created_at: "2026-09-14T08:00:00.000Z",
    ...overrides,
  };
}

describe("emptyWishlistForm", () => {
  it("defaults to equipment, requested, and quantity 1", () => {
    const form = emptyWishlistForm();
    expect(form.category).toBe("equipment");
    expect(form.status).toBe("requested");
    expect(form.quantity).toBe(1);
    expect(form.title).toBe("");
  });
});

describe("wishlist form payload", () => {
  it("maps a stored row back into form fields", () => {
    const form = formFromWishlistItem(row());
    expect(form.title).toBe("HDMI cable");
    expect(form.estimated_cost).toBe("450");
    expect(form.notes).toBe("Also need a spare.");
  });

  it("trims text and nulls empty optional fields", () => {
    const payload = buildWishlistItemPayload({
      ...emptyWishlistForm(),
      title: "  Whiteboard  ",
      description: "  ",
      category: "furniture",
      status: "in_process",
      quantity: 1.8,
      estimated_cost: " 2500.5 ",
      vendor_or_link: "  ",
      notes: "   wall-mount  ",
    });

    expect(payload.title).toBe("Whiteboard");
    expect(payload.description).toBeNull();
    expect(payload.quantity).toBe(1);
    expect(payload.estimated_cost).toBe(2500.5);
    expect(payload.vendor_or_link).toBeNull();
    expect(payload.notes).toBe("wall-mount");
    expect(payload.status).toBe("in_process");
  });

  it("builds notes-only and status+notes patches", () => {
    const form = {
      ...emptyWishlistForm(),
      status: "received" as const,
      notes: "  Arrived  ",
    };
    expect(buildWishlistNotesPayload(form)).toEqual({ notes: "Arrived" });
    expect(buildWishlistStatusNotesPayload(form)).toEqual({
      status: "received",
      notes: "Arrived",
    });
  });
});

describe("parseWishlistCost", () => {
  it("parses blank as null and rejects negatives", () => {
    expect(parseWishlistCost("")).toBeNull();
    expect(parseWishlistCost("  ")).toBeNull();
    expect(parseWishlistCost("-1")).toBeNull();
    expect(parseWishlistCost("12.50")).toBe(12.5);
  });
});

describe("wishlist permissions", () => {
  it("lets staff add items and change status; officers cannot", () => {
    expect(canAddWishlistItem("team_member")).toBe(true);
    expect(canAddWishlistItem("team_lead")).toBe(true);
    expect(canAddWishlistItem("approving_officer")).toBe(false);
    expect(canChangeWishlistStatus("team_member")).toBe(true);
    expect(canChangeWishlistStatus("approving_officer")).toBe(false);
  });

  it("lets a member manage only their own item", () => {
    expect(canManageWishlistItem("team_member", "user-1", "user-1")).toBe(true);
    expect(canManageWishlistItem("team_member", "user-2", "user-1")).toBe(false);
    expect(canDeleteWishlistItem("team_member", "user-2", "user-1")).toBe(false);
    expect(canManageWishlistItem("team_lead", "lead-1", "user-1")).toBe(true);
  });

  it("lets staff and the approving officer edit notes", () => {
    expect(canEditWishlistNotes("team_lead")).toBe(true);
    expect(canEditWishlistNotes("team_member")).toBe(true);
    expect(canEditWishlistNotes("approving_officer")).toBe(true);
    expect(canEditWishlistNotes("reviewing_officer")).toBe(false);
    expect(canEditWishlistNotes("trainee")).toBe(false);
  });
});

describe("wishlist labels", () => {
  it("returns display labels", () => {
    expect(wishlistCategoryLabel("subscription")).toBe("Subscription");
    expect(wishlistStatusLabel("in_process")).toBe("In process");
    expect(formatWishlistAdded("2026-09-14T08:00:00.000Z")).toBe("09/14/2026");
    expect(formatWishlistAdded(null)).toBe("—");
  });
});
