import { describe, expect, it } from "vitest";
import { matchesInvolvementFilter } from "./involvement-filter";

const me = "user-me";
const other = "user-other";

describe("matchesInvolvementFilter", () => {
  it("All keeps every row", () => {
    expect(
      matchesInvolvementFilter("all", me, {
        ownerId: other,
        assigneeIds: [],
      }),
    ).toBe(true);
  });

  it("Assigned to me keeps rows where the current user is an assignee", () => {
    expect(
      matchesInvolvementFilter("assigned", me, {
        ownerId: other,
        assigneeIds: [other, me],
      }),
    ).toBe(true);
    expect(
      matchesInvolvementFilter("assigned", me, {
        ownerId: me,
        assigneeIds: [other],
      }),
    ).toBe(false);
  });

  it("Made by me keeps rows owned by the current user", () => {
    expect(
      matchesInvolvementFilter("created", me, {
        ownerId: me,
        assigneeIds: [other],
      }),
    ).toBe(true);
    expect(
      matchesInvolvementFilter("created", me, {
        ownerId: other,
        assigneeIds: [me],
      }),
    ).toBe(false);
  });

  it("hides assigned and created rows when there is no current user", () => {
    expect(
      matchesInvolvementFilter("assigned", null, {
        ownerId: me,
        assigneeIds: [me],
      }),
    ).toBe(false);
    expect(
      matchesInvolvementFilter("created", undefined, {
        ownerId: me,
        assigneeIds: [me],
      }),
    ).toBe(false);
  });
});
