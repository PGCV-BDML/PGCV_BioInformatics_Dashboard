import { describe, expect, it } from "vitest";
import {
  isDeckId,
  isProgramId,
  pollStatusForRpcError,
  withProgramQuery,
} from "@/lib/training-poll";

describe("training poll ids", () => {
  it("accepts a program uuid and a deck id", () => {
    expect(isProgramId("a63ffadc-dc83-483e-9f13-bda3a70e647b")).toBe(true);
    expect(isDeckId("basic-coding")).toBe(true);
    expect(isProgramId("basic-coding")).toBe(false);
    expect(isDeckId("../basic-coding")).toBe(false);
  });

  it("adds the program and deck to the viewer path", () => {
    expect(
      withProgramQuery(
        "/api/training-presentations/f/1.x/basic-coding.html",
        "a63ffadc-dc83-483e-9f13-bda3a70e647b",
        "basic-coding",
      ),
    ).toBe(
      "/api/training-presentations/f/1.x/basic-coding.html?program=a63ffadc-dc83-483e-9f13-bda3a70e647b&deck=basic-coding",
    );
  });

  it("maps database errors to poll responses", () => {
    expect(pollStatusForRpcError({ code: "42501" }).status).toBe(403);
    expect(pollStatusForRpcError({ code: "P0001" }).status).toBe(409);
    expect(pollStatusForRpcError({ code: "22023" }).status).toBe(400);
    expect(pollStatusForRpcError({ message: "no question" }).status).toBe(409);
  });
});
