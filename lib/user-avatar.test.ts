import { describe, expect, it } from "vitest";
import {
  MAX_AVATAR_BYTES,
  resolveAvatarDisplayUrl,
  validateAvatarImage,
} from "./user-avatar";

describe("validateAvatarImage", () => {
  it("accepts supported image types under the size limit", () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateAvatarImage(file)).toBeNull();
  });

  it("rejects empty files", () => {
    const file = new File([], "photo.png", { type: "image/png" });
    expect(validateAvatarImage(file)).toMatch(/empty/i);
  });

  it("rejects unsupported types", () => {
    const file = new File(["x"], "photo.gif", { type: "image/gif" });
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateAvatarImage(file)).toMatch(/jpeg, png, or webp/i);
  });

  it("rejects files over the limit", () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: MAX_AVATAR_BYTES + 1 });
    expect(validateAvatarImage(file)).toMatch(/too large/i);
  });
});

describe("resolveAvatarDisplayUrl", () => {
  it("returns legacy http(s) avatar_url values", () => {
    expect(
      resolveAvatarDisplayUrl({
        avatar_url: "https://example.com/me.jpg",
      }),
    ).toBe("https://example.com/me.jpg");
  });

  it("ignores invalid legacy urls", () => {
    expect(
      resolveAvatarDisplayUrl({
        avatar_url: "not-a-url",
      }),
    ).toBeNull();
  });

  it("returns null when no avatar is set", () => {
    expect(resolveAvatarDisplayUrl({})).toBeNull();
  });
});
