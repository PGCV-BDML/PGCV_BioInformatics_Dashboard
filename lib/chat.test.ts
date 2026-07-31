import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGE_LENGTH,
  countUnread,
  formatDayDivider,
  mergeMessage,
  normalizeMessageBody,
  shouldGroupWithPrevious,
} from "./chat";
import type { ChatMessage } from "@/types/database";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    conversation_id: "c1",
    sender_id: "u1",
    body: "hello",
    created_at: "2026-07-31T10:00:00.000Z",
    edited_at: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("normalizeMessageBody", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeMessageBody("  hi there \n")).toBe("hi there");
  });

  it("rejects whitespace-only drafts", () => {
    expect(normalizeMessageBody("   \n\t ")).toBeNull();
  });

  it("rejects bodies past the database limit", () => {
    expect(normalizeMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1))).toBeNull();
    expect(normalizeMessageBody("a".repeat(MAX_MESSAGE_LENGTH))).toHaveLength(
      MAX_MESSAGE_LENGTH,
    );
  });
});

describe("countUnread", () => {
  const messages = [
    message({ id: "a", sender_id: "other", created_at: "2026-07-31T09:00:00.000Z" }),
    message({ id: "b", sender_id: "other", created_at: "2026-07-31T11:00:00.000Z" }),
    message({ id: "c", sender_id: "me", created_at: "2026-07-31T12:00:00.000Z" }),
  ];

  it("counts only messages newer than the bookmark", () => {
    expect(countUnread(messages, "2026-07-31T10:00:00.000Z", "me")).toBe(1);
  });

  it("never counts your own messages", () => {
    expect(countUnread(messages, "2026-07-31T00:00:00.000Z", "me")).toBe(2);
  });

  it("treats a missing bookmark as everything unread", () => {
    expect(countUnread(messages, null, "me")).toBe(2);
  });

  it("ignores soft-deleted messages", () => {
    const withDeleted = [
      ...messages,
      message({
        id: "d",
        sender_id: "other",
        created_at: "2026-07-31T13:00:00.000Z",
        deleted_at: "2026-07-31T13:05:00.000Z",
      }),
    ];
    expect(countUnread(withDeleted, "2026-07-31T10:00:00.000Z", "me")).toBe(1);
  });
});

describe("mergeMessage", () => {
  it("appends and keeps ascending order", () => {
    const existing = [message({ id: "a", created_at: "2026-07-31T10:00:00.000Z" })];
    const merged = mergeMessage(
      existing,
      message({ id: "b", created_at: "2026-07-31T09:00:00.000Z" }),
    );
    expect(merged.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("replaces rather than duplicates when the same id arrives twice", () => {
    const existing = [message({ id: "a", body: "first" })];
    const merged = mergeMessage(existing, message({ id: "a", body: "edited" }));
    expect(merged).toHaveLength(1);
    expect(merged[0]?.body).toBe("edited");
  });
});

describe("shouldGroupWithPrevious", () => {
  it("groups the same sender inside the window", () => {
    expect(
      shouldGroupWithPrevious(
        message({ created_at: "2026-07-31T10:02:00.000Z" }),
        message({ created_at: "2026-07-31T10:00:00.000Z" }),
      ),
    ).toBe(true);
  });

  it("does not group across senders", () => {
    expect(
      shouldGroupWithPrevious(
        message({ sender_id: "u2", created_at: "2026-07-31T10:02:00.000Z" }),
        message({ sender_id: "u1", created_at: "2026-07-31T10:00:00.000Z" }),
      ),
    ).toBe(false);
  });

  it("does not group past the window", () => {
    expect(
      shouldGroupWithPrevious(
        message({ created_at: "2026-07-31T10:30:00.000Z" }),
        message({ created_at: "2026-07-31T10:00:00.000Z" }),
      ),
    ).toBe(false);
  });

  it("never groups the first message", () => {
    expect(shouldGroupWithPrevious(message(), undefined)).toBe(false);
  });
});

describe("formatDayDivider", () => {
  const now = new Date(2026, 6, 31, 12, 0, 0);

  it("labels the current day", () => {
    expect(formatDayDivider(new Date(2026, 6, 31, 8, 0, 0).toISOString(), now)).toBe(
      "Today",
    );
  });

  it("labels the previous day", () => {
    expect(formatDayDivider(new Date(2026, 6, 30, 8, 0, 0).toISOString(), now)).toBe(
      "Yesterday",
    );
  });

  it("falls back to a date for anything older", () => {
    const label = formatDayDivider(new Date(2026, 6, 20, 8, 0, 0).toISOString(), now);
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Yesterday");
    expect(label).toContain("20");
  });
});
