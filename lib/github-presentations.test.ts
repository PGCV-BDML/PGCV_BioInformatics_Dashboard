import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createViewToken,
  VIEW_TOKEN_TTL_SECONDS,
  verifyViewToken,
  viewUrlForPath,
} from "@/lib/github-presentations";

describe("presentation view tokens", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_PRESENTATIONS_TOKEN", "test-token-a");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a fresh token and rejects it after expiry", () => {
    const now = Date.UTC(2026, 9, 19, 6);
    const token = createViewToken(now);
    expect(verifyViewToken(token, now)).toBe(true);
    expect(
      verifyViewToken(token, now + (VIEW_TOKEN_TTL_SECONDS + 1) * 1000),
    ).toBe(false);
  });

  it("rejects tampered tokens and tokens signed with another key", () => {
    const now = Date.now();
    const token = createViewToken(now);
    const [exp, sig] = token.split(".");
    expect(verifyViewToken(`${Number(exp) + 999}.${sig}`, now)).toBe(false);
    expect(verifyViewToken("garbage", now)).toBe(false);

    vi.stubEnv("GITHUB_PRESENTATIONS_TOKEN", "rotated-token");
    expect(verifyViewToken(token, now)).toBe(false);
  });

  it("rejects everything when the library isn't configured", () => {
    const token = createViewToken();
    vi.stubEnv("GITHUB_PRESENTATIONS_TOKEN", "");
    expect(verifyViewToken(token)).toBe(false);
  });

  it("builds encoded viewer URLs", () => {
    expect(viewUrlForPath("basic coding.html", "1.x")).toBe(
      "/api/training-presentations/f/1.x/basic%20coding.html",
    );
  });
});
